import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import type { AppSettings } from '../../src/types';
import { defaultVaultPath } from '../services/settingsService';
import { nativeText } from '../services/nativeText';
import { ensureVaultDir } from '../services/vaultService';

interface SystemHandlerDependencies {
  getMainWindow: () => BrowserWindow | null;
  getSettings: () => AppSettings;
  showAbout: () => void;
}

export function registerSystemHandlers(dependencies: SystemHandlerDependencies): void {
  const { getMainWindow, getSettings, showAbout } = dependencies;

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-app-info', () => {
    return {
      name: 'Daily Worklog',
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
      osRelease: `${os.type()} ${os.release()}`,
    };
  });

  ipcMain.handle('get-memory-metrics', () => {
    const memoryUsage = process.memoryUsage();
    return {
      capturedAt: new Date().toISOString(),
      main: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      processes: app.getAppMetrics().map((metric) => ({
        pid: metric.pid,
        type: metric.type,
        cpuPercent: metric.cpu.percentCPUUsage,
        workingSetBytes: metric.memory.workingSetSize * 1024,
        peakWorkingSetBytes: metric.memory.peakWorkingSetSize * 1024,
      })),
    };
  });

  ipcMain.handle('show-about-dialog', () => {
    showAbout();
    return { success: true };
  });

  ipcMain.handle('export-document', async (_event, { title, defaultPath, content, format }) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false };

    const ext = format === 'html' ? 'html' : format === 'txt' ? 'txt' : 'md';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: nativeText(getSettings().language, 'dialogExport', { title }),
      defaultPath: defaultPath || `${title}.${ext}`,
      filters: [
        { name: format.toUpperCase(), extensions: [ext] },
        { name: nativeText(getSettings().language, 'dialogAllFiles'), extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    }

    return { success: false };
  });

  ipcMain.handle('open-in-file-manager', async (_event, targetPath?: string) => {
    try {
      const settings = getSettings();
      const resolvedPath = targetPath || settings.vaultPath || defaultVaultPath;

      if (!fs.existsSync(resolvedPath)) {
        ensureVaultDir(resolvedPath);
      }

      if (fs.existsSync(resolvedPath)) {
        const stat = fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
          const errorMsg = await shell.openPath(resolvedPath);
          if (errorMsg) {
            console.warn('shell.openPath failed, falling back to showItemInFolder:', errorMsg);
            shell.showItemInFolder(resolvedPath);
          }
        } else {
          shell.showItemInFolder(resolvedPath);
        }
        return { success: true };
      }
      return { success: false, error: 'Path not found' };
    } catch (err: any) {
      console.error('Error opening in file manager:', err);
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('open-external-url', async (_event, targetUrl: string) => {
    try {
      if (targetUrl) {
        let formattedUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        await shell.openExternal(formattedUrl);
        return { success: true };
      }
      return { success: false, error: 'Empty URL' };
    } catch (err: any) {
      console.error('Error opening external URL:', err);
      return { success: false, error: err?.message };
    }
  });
}
