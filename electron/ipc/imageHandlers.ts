import { dialog, ipcMain, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import dayjs from 'dayjs';

interface ImageHandlerDependencies {
  getVaultPath: () => string;
  getMainWindow: () => BrowserWindow | null;
  ensureImagesDir: (vaultPath: string) => string;
}

interface SaveImagePayload {
  buffer?: ArrayBuffer | Uint8Array;
  base64Data?: string;
  originalName?: string;
  mimeType?: string;
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function generateUniqueImageFilename(imagesDir: string, originalName?: string, mimeType?: string): string {
  let ext = '.png';
  if (originalName) {
    const candidateExt = path.extname(originalName).toLowerCase();
    if (candidateExt && candidateExt.length <= 6) ext = candidateExt;
  } else if (mimeType) {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('svg')) ext = '.svg';
    else if (mimeType.includes('bmp')) ext = '.bmp';
    else if (mimeType.includes('ico')) ext = '.ico';
  }

  const baseRaw = originalName ? path.basename(originalName, path.extname(originalName)) : 'image';
  const cleanBase = slugify(baseRaw) || 'image';
  const timestamp = dayjs().format('YYYYMMDD-HHmmss');
  let filename = `${cleanBase}-${timestamp}${ext}`;
  let counter = 1;
  while (fs.existsSync(path.join(imagesDir, filename))) {
    filename = `${cleanBase}-${timestamp}-${counter}${ext}`;
    counter++;
  }
  return filename;
}

function imageResult(filename: string, destPath: string) {
  return {
    success: true,
    filename,
    relativePath: `images/${filename}`,
    fullPath: destPath,
    url: `worklog-media://vault/images/${filename}`,
  };
}

export function registerImageHandlers(dependencies: ImageHandlerDependencies): void {
  const { getVaultPath, getMainWindow, ensureImagesDir } = dependencies;

  ipcMain.handle('save-image', async (_event, payload: SaveImagePayload) => {
    try {
      const imagesDir = ensureImagesDir(getVaultPath());
      const filename = generateUniqueImageFilename(imagesDir, payload.originalName, payload.mimeType);
      const destPath = path.join(imagesDir, filename);
      if (payload.buffer) {
        const bytes = payload.buffer instanceof ArrayBuffer ? new Uint8Array(payload.buffer) : payload.buffer;
        fs.writeFileSync(destPath, Buffer.from(bytes));
      } else if (payload.base64Data) {
        const cleanBase64 = payload.base64Data.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
        fs.writeFileSync(destPath, Buffer.from(cleanBase64, 'base64'));
      } else {
        return { success: false, error: 'No image data provided' };
      }
      return imageResult(filename, destPath);
    } catch (error) {
      console.error('Error saving image:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save image' };
    }
  });

  ipcMain.handle('select-image-dialog', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false, error: 'No window available' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Image',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };

    const sourcePath = result.filePaths[0];
    const imagesDir = ensureImagesDir(getVaultPath());
    const filename = generateUniqueImageFilename(imagesDir, path.basename(sourcePath));
    const destPath = path.join(imagesDir, filename);
    fs.copyFileSync(sourcePath, destPath);
    return imageResult(filename, destPath);
  });

  ipcMain.handle('resolve-media-url', (_event, relativeOrAbsPath: string) => {
    if (!relativeOrAbsPath) return '';
    if (/^https?:\/\//i.test(relativeOrAbsPath)
      || relativeOrAbsPath.startsWith('data:')
      || relativeOrAbsPath.startsWith('worklog-media://')) return relativeOrAbsPath;
    const clean = relativeOrAbsPath.replace(/^\.?\/+/, '');
    return `worklog-media://vault/${clean}`;
  });
}
