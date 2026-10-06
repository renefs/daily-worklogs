import { dialog, ipcMain, type BrowserWindow } from 'electron';
import type { AppSettings } from '../../src/types';
import {
  defaultVaultPath,
  getSettings,
  saveSettings,
  readRoutineCompletionsForYear,
  writeRoutineCompletionsForYear,
  readVaultConfig,
  writeVaultConfig,
} from '../services/settingsService';
import { ensureVaultDir, getYearFromDate } from '../services/vaultService';

interface SettingsHandlerDependencies {
  getMainWindow: () => BrowserWindow | null;
  setupVaultWatcher: (vaultPath: string) => void;
}

export function registerSettingsHandlers(dependencies: SettingsHandlerDependencies): void {
  const { getMainWindow, setupVaultWatcher } = dependencies;

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('save-settings', (_event, partialSettings: Partial<AppSettings>) => {
    const previousVaultPath = getSettings().vaultPath;
    const updated = saveSettings(partialSettings);
    if (updated.vaultPath) {
      ensureVaultDir(updated.vaultPath);
    }
    if (updated.vaultPath !== previousVaultPath) {
      setupVaultWatcher(updated.vaultPath);
    }
    return updated;
  });

  ipcMain.handle('get-routine-completions', (_event, date: string) => {
    const { vaultPath } = getSettings();
    const year = getYearFromDate(date);
    const completions = readRoutineCompletionsForYear(vaultPath, year);
    return completions[date] || [];
  });

  ipcMain.handle(
    'update-routine-completions',
    (_event, date: string, routineIds: string[]) => {
      const settings = getSettings();
      const year = getYearFromDate(date);
      const completions = readRoutineCompletionsForYear(settings.vaultPath, year);
      const uniqueIds = Array.from(new Set((routineIds || []).filter(Boolean)));
      if (uniqueIds.length > 0) completions[date] = uniqueIds;
      else delete completions[date];
      writeRoutineCompletionsForYear(settings.vaultPath, year, completions);

      if ((settings as any).routineCompletions) saveSettings({ routineCompletions: undefined } as any);
      return uniqueIds;
    }
  );

  ipcMain.handle('get-default-vault-path', () => {
    return defaultVaultPath;
  });

  ipcMain.handle('select-vault-directory', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;
    const currentSettings = getSettings();
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Worklog Vault Folder',
      defaultPath: currentSettings.vaultPath,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selected = result.filePaths[0];
      ensureVaultDir(selected);

      // If selected directory already contains .daily-worklogs/config.json, merge its configuration
      const vaultConfig = readVaultConfig(selected);
      if (vaultConfig) {
        const { version: _v, updatedAt: _u, ...restVaultConfig } = vaultConfig;
        saveSettings({
          ...restVaultConfig,
          vaultPath: selected,
          hasCompletedOnboarding: true,
        });
      } else {
        saveSettings({ vaultPath: selected });
        writeVaultConfig(selected, currentSettings);
      }
      setupVaultWatcher(selected);
      return selected;
    }
    return null;
  });
}
