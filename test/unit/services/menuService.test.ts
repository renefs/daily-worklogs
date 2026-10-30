// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuItemConstructorOptions } from 'electron';
import type { AppSettings } from '../../../src/types';

let template: MenuItemConstructorOptions[] = [];

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: (built: MenuItemConstructorOptions[]) => {
      template = built;
      return {};
    },
    setApplicationMenu: vi.fn(),
  },
  shell: { openExternal: vi.fn(), openPath: vi.fn() },
}));

import { setupApplicationMenu } from '../../../electron/services/menuService';

const originalPlatform = process.platform;

function buildMenu(platform: NodeJS.Platform, language: 'en' | 'es') {
  Object.defineProperty(process, 'platform', { value: platform });
  const send = vi.fn();
  setupApplicationMenu({
    getMainWindow: () => ({ isDestroyed: () => false, webContents: { send } }) as never,
    showAbout: vi.fn(),
    getSettings: () => ({ language, vaultPath: '' }) as AppSettings,
  });
  return send;
}

function settingsItems(): Array<{ menu: string; item: MenuItemConstructorOptions }> {
  const found: Array<{ menu: string; item: MenuItemConstructorOptions }> = [];
  for (const top of template) {
    const submenu = Array.isArray(top.submenu) ? top.submenu : [];
    for (const item of submenu) {
      if (item.accelerator === 'CmdOrCtrl+,') found.push({ menu: String(top.label), item });
    }
  }
  return found;
}

describe('application menu', () => {
  beforeEach(() => {
    template = [];
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('has a single Settings entry on macOS, in the application menu', () => {
    buildMenu('darwin', 'en');

    const entries = settingsItems();
    expect(entries).toHaveLength(1);
    expect(entries[0].menu).toBe('Daily Worklog');
    expect(entries[0].item.label).toBe('Settings…');
  });

  it('has a single Settings entry on Windows and Linux, in the File menu', () => {
    buildMenu('win32', 'en');

    const entries = settingsItems();
    expect(entries).toHaveLength(1);
    expect(entries[0].menu).toBe('File');
  });

  it('asks the window to open Settings', () => {
    const send = buildMenu('darwin', 'en');

    settingsItems()[0].item.click?.({} as never, undefined, {} as never);

    expect(send).toHaveBeenCalledWith('open-settings');
  });

  it('translates the labels to the app language', () => {
    buildMenu('win32', 'es');

    expect(template.map((top) => top.label).filter(Boolean)).toEqual(['Archivo', 'Edición', 'Visualización', 'Ventana']);
    expect(settingsItems()[0].item.label).toBe('Configuración…');
  });
});
