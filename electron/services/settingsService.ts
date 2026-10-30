import { app, nativeTheme } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_KANBAN_COLUMNS, type AppSettings } from '../../src/types';
import { DEFAULT_AREAS, DEFAULT_PROJECTS, DEFAULT_ROUTINES, DEFAULT_THEME_COLOR } from '../../src/shared/defaultData';
import { atomicWriteFileSync } from '../utils/atomicFile';

export const defaultVaultPath = path.join(os.homedir(), 'Documents', 'DailyWorklog');

export const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: defaultVaultPath,
  language: 'en' as const,
  themeColor: DEFAULT_THEME_COLOR,
  colorScheme: 'auto' as const,
  weekStartDay: 1 as const,
  kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  autoSave: true,
  autoSaveDelay: 1000,
  editorFontSize: 15,
  closedTasksWindowDays: 30,
  routines: DEFAULT_ROUTINES,
  enableDailyRoutines: true,
  hasCompletedOnboarding: false,
  areas: DEFAULT_AREAS,
  projects: DEFAULT_PROJECTS,
};

export const VAULT_CONFIG_DIR = '.daily-worklogs';
export const VAULT_CONFIG_FILE = 'config.json';
export const ROUTINE_COMPLETIONS_DIR = 'routine-completions';

export function getColumnBehavior(status: string, settings?: AppSettings): string {
  const currentSettings = settings || getSettings();
  const cols = currentSettings.kanbanColumns || DEFAULT_KANBAN_COLUMNS;
  if (!cols) return 'todo';
  const match = cols.find((c: any) => c.id === status);
  if (match) return match.behavior;
  if (status === 'done' || status === 'completed') return 'done';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'waiting') return 'waiting';
  if (status === 'backlog') return 'backlog';
  return 'todo';
}

export function getSystemLanguage(): 'en' | 'es' {
  try {
    const locale = (app.getLocale() || '').toLowerCase();
    const primary = locale.split(/[-_]/)[0];
    if (primary === 'es') return 'es';
    if (primary === 'en') return 'en';
  } catch {
    // fallback
  }
  return 'en';
}

export function getVaultConfigPath(vaultPath: string): string {
  return path.join(vaultPath, VAULT_CONFIG_DIR, VAULT_CONFIG_FILE);
}

export function readVaultConfig(vaultPath: string): any | null {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) return null;
    const cfgPath = getVaultConfigPath(vaultPath);
    if (fs.existsSync(cfgPath)) {
      const data = fs.readFileSync(cfgPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading vault config:', err);
  }
  return null;
}

export function writeVaultConfig(vaultPath: string, config: any): void {
  try {
    if (!vaultPath) return;
    const configDir = path.join(vaultPath, VAULT_CONFIG_DIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const cfgPath = path.join(configDir, VAULT_CONFIG_FILE);
    const { vaultPath: _ignored, routineCompletions: _legacyCompletions, ...portableConfig } = config;
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      ...portableConfig,
    };
    atomicWriteFileSync(cfgPath, JSON.stringify(payload, null, 2));
    invalidateSettingsCache();
  } catch (err) {
    console.error('Error writing vault config:', err);
  }
}

function getDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    language: getSystemLanguage(),
  };
}

const SETTINGS_CACHE_TTL_MS = 500;
let settingsCache: { value: AppSettings; readAt: number } | null = null;

export function invalidateSettingsCache(): void {
  settingsCache = null;
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getSettings(): AppSettings {
  if (settingsCache && Date.now() - settingsCache.readAt < SETTINGS_CACHE_TTL_MS) {
    return settingsCache.value;
  }
  const resolved = readSettingsFromDisk();
  settingsCache = { value: resolved, readAt: Date.now() };
  return resolved;
}

export function readSettingsFromDisk(): AppSettings {
  const settingsPath = getSettingsPath();
  let localSettings: any = getDefaultSettings();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      localSettings = { ...getDefaultSettings(), ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading local settings:', err);
  }

  if (localSettings.vaultPath && fs.existsSync(localSettings.vaultPath)) {
    const vaultConfig = readVaultConfig(localSettings.vaultPath);
    if (vaultConfig) {
      const { version: _v, updatedAt: _u, ...restVaultConfig } = vaultConfig;
      localSettings = {
        ...localSettings,
        ...restVaultConfig,
        vaultPath: localSettings.vaultPath,
      };
    }
  }

  // Drop keys of removed features; the next save removes them from disk.
  const {
    templates: _legacyTemplates,
    defaultTemplateId: _legacyDefaultTemplateId,
    dateFormat: _legacyDateFormat,
    showDailyRoutinesPanel: _legacyShowDailyRoutinesPanel,
    ...settingsWithoutLegacyKeys
  } = localSettings;
  localSettings = settingsWithoutLegacyKeys;

  // Seed defaults only when a key is missing (new installs). An explicitly empty
  // list is a valid user choice and must survive a reload.
  if (!Array.isArray(localSettings.areas)) {
    localSettings.areas = DEFAULT_AREAS;
  }
  if (!Array.isArray(localSettings.projects)) {
    localSettings.projects = DEFAULT_PROJECTS;
  }

  return localSettings as AppSettings;
}

export function saveSettings(newSettings: Partial<AppSettings>): AppSettings {
  try {
    const settingsPath = getSettingsPath();
    const current = getSettings();
    const merged = { ...current, ...newSettings };
    const { routineCompletions: _legacyCompletions, ...settingsWithoutCompletions } = merged as any;
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    atomicWriteFileSync(settingsPath, JSON.stringify(settingsWithoutCompletions, null, 2));
    invalidateSettingsCache();

    if (merged.vaultPath && fs.existsSync(merged.vaultPath)) {
      writeVaultConfig(merged.vaultPath, settingsWithoutCompletions);
    }

    if (merged.colorScheme) {
      nativeTheme.themeSource = merged.colorScheme === 'auto' ? 'system' : merged.colorScheme;
    }
    return settingsWithoutCompletions as AppSettings;
  } catch (err) {
    console.error('Error saving settings:', err);
    return getSettings();
  }
}

export function getRoutineCompletionsPath(vaultPath: string, year: string): string {
  return path.join(vaultPath, VAULT_CONFIG_DIR, ROUTINE_COMPLETIONS_DIR, `${year}.json`);
}

export function readRoutineCompletionsForYear(vaultPath: string, year: string): Record<string, string[]> {
  try {
    const filePath = getRoutineCompletionsPath(vaultPath, year);
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return parsed.completions && typeof parsed.completions === 'object' ? parsed.completions : {};
    }
  } catch (err) {
    console.error('Error reading routine completions:', err);
  }

  const legacy = (getSettings() as any).routineCompletions || {};
  return Object.fromEntries(
    Object.entries(legacy).filter(([date]) => date.startsWith(`${year}-`))
  ) as Record<string, string[]>;
}

export function writeRoutineCompletionsForYear(
  vaultPath: string,
  year: string,
  completions: Record<string, string[]>
): void {
  const filePath = getRoutineCompletionsPath(vaultPath, year);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomicWriteFileSync(
    filePath,
    JSON.stringify({ version: 1, year, completions }, null, 2)
  );
}
