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

import {
  invalidateSettingsCache,
  readSettingsFromDisk,
  saveSettings,
} from '../../../electron/services/settingsService';

describe('settings seeding and persistence', () => {
  let vaultDir: string;

  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-userdata-'));
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-vault-'));
    invalidateSettingsCache();
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(vaultDir, { recursive: true, force: true });
    invalidateSettingsCache();
  });

  it('seeds neutral English defaults for a new install', () => {
    fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify({ vaultPath: vaultDir }));

    const settings = readSettingsFromDisk();

    expect(settings.areas?.map((a) => a.name)).toEqual(['Work', 'General']);
    expect(settings.projects).toEqual([]);
    expect(settings.enableDailyRoutines).toBe(true);
    expect(JSON.stringify(settings.areas)).not.toMatch(/Webcast|Wowza/);
  });

  it('keeps zero areas after they are saved and reloaded', () => {
    fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify({ vaultPath: vaultDir }));

    saveSettings({ areas: [], projects: [] });
    invalidateSettingsCache();
    const reloaded = readSettingsFromDisk();

    expect(reloaded.areas).toEqual([]);
    expect(reloaded.projects).toEqual([]);

    const vaultConfig = JSON.parse(
      fs.readFileSync(path.join(vaultDir, '.daily-worklogs', 'config.json'), 'utf-8')
    );
    expect(vaultConfig.areas).toEqual([]);
  });

  it('does not touch areas, projects or routines of an existing vault', () => {
    const areas = [{ id: 'webcast', name: 'Webcast', color: 'indigo', icon: 'broadcast' }];
    const projects = [{ id: 'p1', name: 'Migración Wowza', areaName: 'Webcast', status: 'active' }];
    const routines = [{ id: 'r1', title: 'Standup', schedule: 'weekdays', enabled: true }];
    fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify({ vaultPath: vaultDir }));
    fs.mkdirSync(path.join(vaultDir, '.daily-worklogs'), { recursive: true });
    fs.writeFileSync(
      path.join(vaultDir, '.daily-worklogs', 'config.json'),
      JSON.stringify({ version: 1, areas, projects, routines })
    );

    const settings = readSettingsFromDisk();

    expect(settings.areas).toEqual(areas);
    expect(settings.projects).toEqual(projects);
    expect(settings.routines).toEqual(routines);
  });

  it('does not seed projects into an existing vault that defines areas without projects', () => {
    const areas = [{ id: 'webcast', name: 'Webcast' }];
    fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify({ vaultPath: vaultDir, areas }));

    const settings = readSettingsFromDisk();

    expect(settings.areas).toEqual(areas);
    expect(settings.projects).toEqual([]);
  });
});
