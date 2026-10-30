// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let userDataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => userDataDir,
    getLocale: () => 'en-US',
  },
  nativeTheme: { themeSource: 'system' },
}));

import { readSettingsFromDisk } from '../../../electron/services/settingsService';

describe('readSettingsFromDisk legacy template keys', () => {
  let vaultDir: string;

  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-userdata-'));
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-vault-'));
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it('drops templates, defaultTemplateId and dateFormat from local and vault config', () => {
    fs.writeFileSync(
      path.join(userDataDir, 'settings.json'),
      JSON.stringify({
        vaultPath: vaultDir,
        weekStartDay: 3,
        templates: [{ id: 'old', name: 'Old', content: '# {{date}}' }],
        defaultTemplateId: 'old',
      })
    );
    fs.mkdirSync(path.join(vaultDir, '.daily-worklogs'), { recursive: true });
    fs.writeFileSync(
      path.join(vaultDir, '.daily-worklogs', 'config.json'),
      JSON.stringify({ version: 1, dateFormat: 'DD/MM/YYYY', templates: [], themeColor: 'teal' })
    );

    const settings = readSettingsFromDisk() as unknown as Record<string, unknown>;

    expect(settings).not.toHaveProperty('templates');
    expect(settings).not.toHaveProperty('defaultTemplateId');
    expect(settings).not.toHaveProperty('dateFormat');
    expect(settings.weekStartDay).toBe(3);
    expect(settings.themeColor).toBe('teal');
  });
});
