import { Menu, MenuItemConstructorOptions, shell, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import type { AppSettings } from '../../src/types';

interface MenuServiceDependencies {
  getMainWindow: () => BrowserWindow | null;
  showAbout: () => void;
  getSettings: () => AppSettings;
}

export function setupApplicationMenu(dependencies: MenuServiceDependencies): void {
  const { getMainWindow, showAbout, getSettings } = dependencies;
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Daily Worklog',
            submenu: [
              {
                label: 'About Daily Worklog',
                click: () => showAbout(),
              },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  const mainWindow = getMainWindow();
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('open-settings');
                  }
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('trigger-save');
            }
          },
        },
        { type: 'separator' as const },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-settings');
            }
          },
        },
        {
          label: 'Open Vault in File Manager',
          click: () => {
            const { vaultPath } = getSettings();
            if (vaultPath && fs.existsSync(vaultPath)) {
              shell.openPath(vaultPath);
            }
          },
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Daily Worklog GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/renefs/daily-worklogs');
          },
        },
        ...(!isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'About Daily Worklog',
                click: () => showAbout(),
              },
            ]
          : []),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
