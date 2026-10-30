import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  shell,
} from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { createDailyNoteContent, insertBeforeNotesSection, stripNotesSection } from '../src/utils/dailyNoteSections';
import type { TaskItem } from '../src/types';
import { mapWithConcurrency } from './utils/async';
import { resolvePathInside } from './utils/security';
import { atomicWriteFile } from './utils/atomicFile';
import {
  ensureImagesDir,
  ensureTasksDir,
  ensureVaultDir,
  ensureYearDir,
  getNoteFilePath,
  getYearFromDate,
} from './services/vaultService';
import {
  parseNumericTaskId,
  readTaskFiles,
  buildTaskFromFile,
  type TaskFileRead,
} from './services/taskFileService';
import {
  DEFAULT_AREAS,
  getColumnBehavior,
  getSettings,
  getVaultConfigPath,
  invalidateSettingsCache,
  saveSettings,
  VAULT_CONFIG_DIR,
  writeVaultConfig,
} from './services/settingsService';
import { setupApplicationMenu } from './services/menuService';
import { registerTaskHandlers } from './ipc/taskHandlers';
import { registerNoteHandlers } from './ipc/noteHandlers';
import { registerImageHandlers } from './ipc/imageHandlers';
import { registerOrganizationHandlers } from './ipc/organizationHandlers';
import { registerReportHandlers } from './ipc/reportHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerSystemHandlers } from './ipc/systemHandlers';
import { registerSearchHandlers } from './ipc/searchHandlers';

// Register custom protocol scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'worklog-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let vaultWatcher: fs.FSWatcher | null = null;
const internalWrites = new Map<string, { deadline: number; expectedContent: Buffer }>();
let allowWindowClose = false;

const FILE_READ_CONCURRENCY = 16;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function writeInternalFile(filePath: string, content: string | NodeJS.ArrayBufferView): Promise<void> {
  const resolved = path.resolve(filePath);
  const writeMarker = {
    deadline: Date.now() + 1_000,
    expectedContent: Buffer.from(content as Uint8Array),
  };
  internalWrites.set(resolved, writeMarker);
  setTimeout(() => {
    if (internalWrites.get(resolved) === writeMarker) internalWrites.delete(resolved);
  }, 1_500);
  await atomicWriteFile(filePath, content);
}

function setupVaultWatcher(vaultPath: string): void {
  vaultWatcher?.close();
  vaultWatcher = null;
  if (!vaultPath || !fs.existsSync(vaultPath)) return;

  const pending = new Map<string, NodeJS.Timeout>();
  try {
    vaultWatcher = fs.watch(vaultPath, { recursive: true }, (_eventType, rawFilename) => {
      if (!rawFilename || !mainWindow || mainWindow.isDestroyed()) return;
      const relativePath = rawFilename.toString().replaceAll('\\', '/');
      const pathParts = relativePath.split('/');
      if (pathParts.some((part, index) => part.startsWith('.') && !(index === 0 && part === VAULT_CONFIG_DIR))) return;
      const absolutePath = path.resolve(vaultPath, relativePath);
      const existingTimer = pending.get(relativePath);
      if (existingTimer) clearTimeout(existingTimer);
      pending.set(
        relativePath,
        setTimeout(async () => {
          pending.delete(relativePath);
          const internalWrite = internalWrites.get(absolutePath);
          if (internalWrite) {
            if (internalWrite.deadline >= Date.now() && fs.existsSync(absolutePath)) {
              try {
                const actualContent = await fsp.readFile(absolutePath);
                if (actualContent.equals(internalWrite.expectedContent)) return;
              } catch {
                // Reconcile through the normal external-change path below.
              }
            }
            internalWrites.delete(absolutePath);
          }
          if (relativePath.startsWith(`${VAULT_CONFIG_DIR}/`)) invalidateSettingsCache();
          const noteMatch = /(?:^|\/)(\d{4}-\d{2}-\d{2})\.md$/.exec(relativePath);
          if (noteMatch) {
            const date = noteMatch[1];
            const note = getNoteFilePath(vaultPath, date);
            const payload = note.exists
              ? {
                  date,
                  content: await fsp.readFile(note.filepath, 'utf-8'),
                  lastModified: (await fsp.stat(note.filepath)).mtime.toISOString(),
                  exists: true,
                }
              : { date, content: '', exists: false };
            mainWindow?.webContents.send('note-file-changed', payload);
          }
          mainWindow?.webContents.send('vault-files-changed', { relativePath });
        }, 200)
      );
    });
    vaultWatcher.on('error', (error) => console.error('Vault watcher error:', error));
  } catch (error) {
    console.error('Failed to watch vault:', error);
    vaultWatcher = null;
  }
}

function showAbout(): void {
  if (process.platform === 'darwin') {
    app.showAboutPanel();
  } else {
    dialog.showMessageBox(mainWindow || (undefined as any), {
      type: 'info',
      title: 'About Daily Worklog',
      message: 'Daily Worklog',
      detail: `Version: ${app.getVersion() || '1.15.3'}\nElectron: ${process.versions.electron}\nChromium: ${process.versions.chrome}\nNode.js: ${process.versions.node}\nOS: ${process.platform} (${process.arch})\n\nCross-platform Daily Worklog Desktop Application`,
      buttons: ['OK'],
    });
  }
}

function createWindow(): void {
  allowWindowClose = false;
  const settings = getSettings();
  ensureVaultDir(settings.vaultPath);
  ensureImagesDir(settings.vaultPath);
  if (!fs.existsSync(getVaultConfigPath(settings.vaultPath))) {
    writeVaultConfig(settings.vaultPath, settings);
  }

  if (settings.colorScheme) {
    nativeTheme.themeSource = settings.colorScheme === 'auto' ? 'system' : settings.colorScheme;
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');
  const iconPath = fs.existsSync(path.join(__dirname, '../resources/icon.png'))
    ? path.join(__dirname, '../resources/icon.png')
    : path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: settings.colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
    title: 'Daily Worklog',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(?:https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (allowWindowClose) return;
    event.preventDefault();
    mainWindow?.webContents.send('request-editor-flush-before-close');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('editor-flush-before-close-complete', async (_event, succeeded: boolean) => {
  if (!succeeded && mainWindow) {
    const isSpanish = getSettings().language === 'es';
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: isSpanish ? 'Cambios sin guardar' : 'Unsaved changes',
      message: isSpanish
        ? 'No se pudieron guardar todos los cambios.'
        : 'Not all changes could be saved.',
      detail: isSpanish
        ? 'Puedes seguir editando e intentar guardarlos de nuevo, o salir y descartar los cambios sin guardar.'
        : 'You can keep editing and retry the save, or quit and discard the unsaved changes.',
      buttons: isSpanish ? ['Seguir editando', 'Salir sin guardar'] : ['Keep Editing', 'Quit Without Saving'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (result.response !== 1 || !mainWindow || mainWindow.isDestroyed()) return;
  }
  allowWindowClose = true;
  mainWindow?.close();
});

// Task helper methods
async function loadAllTasks(tasksDir: string) {
  const reads = await readTaskFiles(tasksDir, FILE_READ_CONCURRENCY);
  return reads.map((read) => buildTaskFromFile(read.filepath, read.filename, read.raw, read.stat));
}

async function updateTaskFrontmatter(
  tasksDir: string,
  mapper: (data: Record<string, unknown>, read: TaskFileRead) => Record<string, unknown> | null
): Promise<number> {
  const reads = await readTaskFiles(tasksDir, FILE_READ_CONCURRENCY);
  const pending: Array<{ filepath: string; filename: string; content: string }> = [];

  for (const read of reads) {
    try {
      const parsed = matter(read.raw);
      const data = parsed.data || {};
      const updatedData = mapper(data, read);
      if (updatedData) {
        pending.push({
          filepath: read.filepath,
          filename: read.filename,
          content: matter.stringify(parsed.content, updatedData),
        });
      }
    } catch (fileErr) {
      console.warn(`Error updating task file ${read.filename}:`, fileErr);
    }
  }

  const written = await mapWithConcurrency(pending, FILE_READ_CONCURRENCY, async (item) => {
    try {
      await fsp.writeFile(item.filepath, item.content, 'utf-8');
      return true;
    } catch (fileErr) {
      console.warn(`Error writing task file ${item.filename}:`, fileErr);
      return false;
    }
  });

  return written.filter(Boolean).length;
}

async function getMaxTaskId(tasksDir: string): Promise<number> {
  try {
    const reads = await readTaskFiles(tasksDir, FILE_READ_CONCURRENCY);
    let maxId = 0;
    for (const read of reads) {
      try {
        const taskId = parseNumericTaskId(matter(read.raw).data);
        if (taskId && taskId > maxId) {
          maxId = taskId;
        }
      } catch {}
    }
    return maxId;
  } catch (err) {
    console.error('Error getting max task id:', err);
    return 0;
  }
}

async function ensureTasksHaveIds(tasksDir: string): Promise<void> {
  try {
    const reads = await readTaskFiles(tasksDir, FILE_READ_CONCURRENCY);
    const unassignedFiles: Array<{ read: TaskFileRead; createdTime: number }> = [];
    let maxId = 0;

    for (const read of reads) {
      try {
        const parsed = matter(read.raw);
        const taskId = parseNumericTaskId(parsed.data);
        if (taskId) {
          if (taskId > maxId) maxId = taskId;
        } else {
          const createdTime = parsed.data?.created
            ? new Date(parsed.data.created).getTime()
            : read.stat.birthtimeMs || read.stat.mtimeMs;
          unassignedFiles.push({ read, createdTime });
        }
      } catch {}
    }

    if (unassignedFiles.length === 0) return;

    unassignedFiles.sort(
      (a, b) => a.createdTime - b.createdTime || a.read.filename.localeCompare(b.read.filename)
    );
    const assignments = unassignedFiles.map((item) => {
      maxId++;
      return { read: item.read, id: maxId };
    });

    await mapWithConcurrency(assignments, FILE_READ_CONCURRENCY, async ({ read, id }) => {
      try {
        const parsed = matter(read.raw);
        const updatedContent = matter.stringify(parsed.content, { ...parsed.data, id });
        await fsp.writeFile(read.filepath, updatedContent, 'utf-8');
      } catch (e) {
        console.warn('Could not auto-assign ID to task file:', read.filename, e);
      }
    });
  } catch (err) {
    console.error('Error ensuring task IDs:', err);
  }
}

async function parseTaskFile(filepath: string, filename: string): Promise<TaskItem> {
  const [rawContent, stat] = await Promise.all([
    fsp.readFile(filepath, 'utf-8'),
    fsp.stat(filepath),
  ]);
  return buildTaskFromFile(filepath, filename, rawContent, stat);
}

// App lifecycle
app.whenReady().then(() => {
  const iconPath = fs.existsSync(path.join(__dirname, '../resources/icon.png'))
    ? path.join(__dirname, '../resources/icon.png')
    : path.join(__dirname, '../public/icon.png');

  app.setAboutPanelOptions({
    applicationName: 'Daily Worklog',
    applicationVersion: app.getVersion() || '1.15.3',
    version: app.getVersion() || '1.15.3',
    copyright: 'Copyright © 2026 Daily Worklog',
    authors: ['Daily Worklog Team'],
    website: 'https://github.com/renefs/daily-worklogs',
    iconPath: iconPath,
    credits: 'Cross-platform desktop application to store, edit, and visualize daily worklogs using Markdown.',
  });

  setupApplicationMenu({
    getMainWindow: () => mainWindow,
    showAbout,
    getSettings,
  });

  // Register domain IPC handlers
  registerSettingsHandlers({
    getMainWindow: () => mainWindow,
    setupVaultWatcher,
  });

  registerSystemHandlers({
    getMainWindow: () => mainWindow,
    getSettings,
    showAbout,
  });

  registerNoteHandlers({
    getSettings,
    ensureVaultDir,
    ensureYearDir,
    getNoteFilePath,
    getYearFromDate,
    writeInternalFile,
    fileReadConcurrency: FILE_READ_CONCURRENCY,
  });

  registerReportHandlers({
    getSettings,
    fileReadConcurrency: FILE_READ_CONCURRENCY,
  });

  registerSearchHandlers({
    getVaultPath: () => getSettings().vaultPath,
  });

  registerTaskHandlers({
    getVaultPath: () => getSettings().vaultPath,
    ensureTasksHaveIds,
    getMaxTaskId,
    getColumnBehavior: (status) => getColumnBehavior(status, getSettings()),
    slugify,
    writeInternalFile,
    parseTaskFile,
    buildTaskMetadata: (read) => buildTaskFromFile(read.filepath, read.filename, read.raw, read.stat, false),
  });

  // Log task to daily note handler
  ipcMain.handle('log-task-to-daily-note', async (_event, { date, taskTitle, status, priority, filename, taskId }) => {
    const { vaultPath } = getSettings();
    const targetDate = date || new Date().toISOString().split('T')[0];
    const year = getYearFromDate(targetDate);
    const yearDir = ensureYearDir(vaultPath, year);
    const filepath = path.join(yearDir, `${targetDate}.md`);

    let content = '';
    if (fs.existsSync(filepath)) {
      content = fs.readFileSync(filepath, 'utf-8');
    } else {
      content = createDailyNoteContent(targetDate);
    }

    const behavior = getColumnBehavior(status, getSettings());
    const isDone = behavior === 'done' || behavior === 'cancelled';
    const checkbox = isDone ? '- [x]' : '- [ ]';
    const statusBadge = behavior === 'cancelled' ? ' [Cancelled]' : '';
    const priorityStr = priority ? ` [${priority}]` : '';
    const idBadge = taskId ? ` (#${taskId})` : (filename ? ` (\`${filename}\`)` : '');
    const logLine = `${checkbox} Worked on **${taskTitle}**${idBadge}${statusBadge}${priorityStr}`;

    if (!stripNotesSection(content).includes(taskTitle)) {
      if (isDone && content.includes('## ✅ Accomplishments')) {
        content = content.replace(/(## ✅ Accomplishments[^\n]*\n)/, `$1${logLine}\n`);
      } else if (!isDone && content.includes('## ⏳ In Progress')) {
        content = content.replace(/(## ⏳ In Progress[^\n]*\n)/, `$1${logLine}\n`);
      } else if (content.includes("## 🎯 Today's Goals")) {
        content = content.replace(/(## 🎯 Today's Goals[^\n]*\n)/, `$1${logLine}\n`);
      } else if (content.includes('## Tasks')) {
        content = content.replace(/(## Tasks[^\n]*\n)/, `$1${logLine}\n`);
      } else {
        content = insertBeforeNotesSection(content, `### 📋 Task Log\n${logLine}`);
      }
      fs.writeFileSync(filepath, content, 'utf-8');
    }

    return { success: true };
  });

  registerImageHandlers({
    getVaultPath: () => getSettings().vaultPath,
    getMainWindow: () => mainWindow,
    ensureImagesDir,
  });

  registerOrganizationHandlers({
    getSettings,
    saveSettings,
    defaultAreas: DEFAULT_AREAS,
    ensureTasksDir,
    loadAllTasks,
    updateTaskFrontmatter,
  });

  // Handle worklog-media protocol for local vault images
  protocol.handle('worklog-media', async (request) => {
    try {
      const urlObj = new URL(request.url);
      const { vaultPath } = getSettings();
      if (urlObj.hostname !== 'vault') return new Response('Invalid media location', { status: 403 });
      const subPath = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ''));
      const targetFilePath = resolvePathInside(vaultPath, subPath);

      if (!fs.existsSync(targetFilePath)) {
        return new Response('Media file not found', { status: 404 });
      }

      return net.fetch(pathToFileURL(targetFilePath).toString());
    } catch (err: any) {
      console.error('worklog-media protocol error:', err);
      return new Response('Error loading media: ' + err?.message, { status: 500 });
    }
  });

  createWindow();
  setupVaultWatcher(getSettings().vaultPath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  vaultWatcher?.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
