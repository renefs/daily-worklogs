import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  protocol,
  net,
  Menu,
  MenuItemConstructorOptions,
  nativeTheme,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';

// Register custom protocol scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'worklog-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatTemplateDate(dateStr: string, format?: string, lang?: string): string {
  const targetLang = lang === 'es' ? 'es' : 'en';
  const targetFormat = format && format.trim() ? format.trim() : 'YYYY-MM-DD';
  try {
    const d = dayjs(dateStr).locale(targetLang);
    if (!d.isValid()) return dateStr;
    return d.format(targetFormat);
  } catch {
    return dateStr;
  }
}

function formatTemplateContent(
  content: string,
  dateStr: string,
  dateFormat?: string,
  lang?: string
): string {
  if (!content) return '';
  const targetLang = lang === 'es' ? 'es' : 'en';
  const defaultFormat = dateFormat && dateFormat.trim() ? dateFormat.trim() : 'YYYY-MM-DD';

  let processed = content.replace(/\{\{date:([^}]+)\}\}/g, (_match, customFmt) => {
    return formatTemplateDate(dateStr, customFmt.trim(), targetLang);
  });

  processed = processed.replace(/\{\{date\}\}/g, () => {
    return formatTemplateDate(dateStr, defaultFormat, targetLang);
  });

  return processed;
}



// Path constants
let mainWindow: BrowserWindow | null = null;

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'standard-worklog',
    name: 'Standard Daily Worklog',
    description: 'Structured template with Goals, Completed Tasks, In Progress, and Blockers',
    content: `# {{date}} - Daily Worklog

## 🎯 Today's Goals & Priorities
- [ ] 

## ✅ Accomplishments & Completed Tasks
- [ ] 

## ⏳ In Progress
- [ ] 

## 🚧 Blockers & Notes
- None

## 📝 General Meeting & Discussion Notes
- 
`,
  },
  {
    id: 'simple-tasks',
    name: 'Simple Checklist',
    description: 'Quick task list with notes',
    content: `# {{date}}

## Tasks
- [ ] 

## Notes
`,
  },
  {
    id: 'standup',
    name: 'Daily Standup (Yesterday, Today, Blockers)',
    description: 'Agile daily standup format',
    content: `# Standup - {{date}}

### 1. What did I achieve yesterday?
- 

### 2. What will I work on today?
- [ ] 

### 3. Are there any impediments or blockers?
- None
`,
  },
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Completely blank note with date header',
    content: `# {{date}}

`,
  },
];

// Default Kanban Columns
const DEFAULT_KANBAN_COLUMNS = [
  {
    id: 'backlog',
    title: 'Backlog',
    titleKey: 'tasks.columnBacklog',
    color: 'gray',
    iconName: 'inbox',
    visible: true,
    behavior: 'backlog',
  },
  {
    id: 'todo',
    title: 'To do',
    titleKey: 'tasks.columnTodo',
    color: 'blue',
    iconName: 'circle-dot',
    visible: true,
    behavior: 'todo',
  },
  {
    id: 'in_progress',
    title: 'In progress',
    titleKey: 'tasks.columnInProgress',
    color: 'indigo',
    iconName: 'player-play',
    visible: true,
    behavior: 'in_progress',
  },
  {
    id: 'waiting',
    title: 'Waiting',
    titleKey: 'tasks.columnWaiting',
    color: 'yellow',
    iconName: 'hourglass',
    visible: true,
    behavior: 'waiting',
  },
  {
    id: 'done',
    title: 'Done',
    titleKey: 'tasks.columnDone',
    color: 'teal',
    iconName: 'circle-check',
    visible: true,
    behavior: 'done',
  },
];

// Default Routines
const DEFAULT_ROUTINES = [
  {
    id: 'routine-email',
    title: 'Check Email & Messages',
    description: 'Review inbox and team chat channels',
    url: '',
    schedule: 'weekdays' as const,
    enabled: true,
  },
  {
    id: 'routine-calendar',
    title: 'Check Calendar & Schedule',
    description: 'Review meetings and agenda for today',
    url: '',
    schedule: 'weekdays' as const,
    enabled: true,
  },
  {
    id: 'routine-monitoring',
    title: 'Check System Status & Monitoring',
    description: 'Verify server health, alerts and dashboards',
    url: 'https://uptimerobot.com',
    schedule: 'everyday' as const,
    enabled: true,
  },
];

// Default Settings
const defaultVaultPath = path.join(os.homedir(), 'Documents', 'DailyWorklog');
const DEFAULT_SETTINGS = {
  vaultPath: defaultVaultPath,
  language: 'en' as const,
  themeColor: 'indigo',
  colorScheme: 'auto' as const,
  weekStartDay: 1 as const, // 1 = Monday
  defaultTemplateId: 'standard-worklog',
  templates: DEFAULT_TEMPLATES,
  kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  autoSave: true,
  autoSaveDelay: 1000,
  dateFormat: 'YYYY-MM-DD',
  editorFontSize: 15,
  hideCompletedOlderThan30Days: false,
  routines: DEFAULT_ROUTINES,
  routineCompletions: {} as Record<string, string[]>,
  showDailyRoutinesPanel: true,
  hasCompletedOnboarding: false,
};

function getColumnBehavior(status: string): string {
  const settings = getSettings();
  const cols = settings.kanbanColumns || DEFAULT_KANBAN_COLUMNS;
  const match = cols.find((c: any) => c.id === status);
  if (match) return match.behavior;
  if (status === 'done' || status === 'completed') return 'done';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'waiting') return 'waiting';
  if (status === 'backlog') return 'backlog';
  return 'todo';
}

function getSystemLanguage(): 'en' | 'es' {
  try {
    const locale = (app.getLocale() || '').toLowerCase();
    const primary = locale.split(/[-_]/)[0];
    if (primary === 'es') return 'es';
    if (primary === 'en') return 'en';
  } catch (err) {
    // fallback
  }
  return 'en';
}

const VAULT_CONFIG_DIR = '.daily-worklogs';
const VAULT_CONFIG_FILE = 'config.json';

function getVaultConfigPath(vaultPath: string): string {
  return path.join(vaultPath, VAULT_CONFIG_DIR, VAULT_CONFIG_FILE);
}

function readVaultConfig(vaultPath: string): any | null {
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

function writeVaultConfig(vaultPath: string, config: any): void {
  try {
    if (!vaultPath) return;
    const configDir = path.join(vaultPath, VAULT_CONFIG_DIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const cfgPath = path.join(configDir, VAULT_CONFIG_FILE);
    // Exclude machine-specific vaultPath from portable vault config
    const { vaultPath: _ignored, ...portableConfig } = config;
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      ...portableConfig,
    };
    fs.writeFileSync(cfgPath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing vault config:', err);
  }
}

function getDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    language: getSystemLanguage(),
  };
}

function getSettings() {
  let localSettings: any = getDefaultSettings();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      localSettings = { ...getDefaultSettings(), ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading local settings:', err);
  }

  // If vault exists and contains .daily-worklogs/config.json, merge portable workspace settings
  if (localSettings.vaultPath && fs.existsSync(localSettings.vaultPath)) {
    const vaultConfig = readVaultConfig(localSettings.vaultPath);
    if (vaultConfig) {
      const { version: _v, updatedAt: _u, ...restVaultConfig } = vaultConfig;
      localSettings = {
        ...localSettings,
        ...restVaultConfig,
        vaultPath: localSettings.vaultPath, // Preserve local machine vaultPath
      };
    }
  }

  return localSettings;
}

function saveSettings(newSettings: any) {
  try {
    const current = getSettings();
    const merged = { ...current, ...newSettings };
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');

    // Sync portable settings to vault folder if vaultPath exists
    if (merged.vaultPath && fs.existsSync(merged.vaultPath)) {
      writeVaultConfig(merged.vaultPath, merged);
    }

    if (merged.colorScheme) {
      nativeTheme.themeSource = merged.colorScheme === 'auto' ? 'system' : merged.colorScheme;
    }
    return merged;
  } catch (err) {
    console.error('Error saving settings:', err);
    return getSettings();
  }
}

function ensureVaultDir(vaultPath: string) {
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }
}

function getYearFromDate(date: string): string {
  const match = date.match(/^(\d{4})/);
  if (match) return match[1];
  return new Date().getFullYear().toString();
}

function ensureYearDir(vaultPath: string, year: string): string {
  ensureVaultDir(vaultPath);
  const yearDir = path.join(vaultPath, year);
  if (!fs.existsSync(yearDir)) {
    fs.mkdirSync(yearDir, { recursive: true });
  }
  return yearDir;
}

function getNoteFilePath(vaultPath: string, date: string): {
  filepath: string;
  exists: boolean;
  year: string;
  filename: string;
  relativePath: string;
} {
  const year = getYearFromDate(date);
  const filename = `${date}.md`;
  const yearFilePath = path.join(vaultPath, year, filename);
  const rootFilePath = path.join(vaultPath, filename);

  if (fs.existsSync(yearFilePath)) {
    return {
      filepath: yearFilePath,
      exists: true,
      year,
      filename,
      relativePath: `${year}/${filename}`,
    };
  }

  if (fs.existsSync(rootFilePath)) {
    return {
      filepath: rootFilePath,
      exists: true,
      year,
      filename,
      relativePath: filename,
    };
  }

  return {
    filepath: yearFilePath,
    exists: false,
    year,
    filename,
    relativePath: `${year}/${filename}`,
  };
}

function ensureTasksDir(vaultPath: string) {
  ensureVaultDir(vaultPath);
  const tasksDir = path.join(vaultPath, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  return tasksDir;
}

function ensureImagesDir(vaultPath: string) {
  ensureVaultDir(vaultPath);
  const imagesDir = path.join(vaultPath, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueImageFilename(imagesDir: string, originalName?: string, mimeType?: string): string {
  let ext = '.png';
  if (originalName) {
    const candidateExt = path.extname(originalName).toLowerCase();
    if (candidateExt && candidateExt.length <= 6) {
      ext = candidateExt;
    }
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

function createWindow() {
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
    title: 'Daily Worklog',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showAbout() {
  if (process.platform === 'darwin') {
    app.showAboutPanel();
  } else {
    dialog.showMessageBox(mainWindow || (undefined as any), {
      type: 'info',
      title: 'About Daily Worklog',
      message: 'Daily Worklog',
      detail: `Version: ${app.getVersion() || '1.1.0'}\nElectron: ${process.versions.electron}\nChromium: ${process.versions.chrome}\nNode.js: ${process.versions.node}\nOS: ${os.type()} ${os.release()} (${os.arch()})\n\nCross-platform Daily Worklog Desktop Application`,
      buttons: ['OK'],
    });
  }
}

function setupApplicationMenu() {
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
                if (mainWindow) {
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
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
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

// App lifecycle
app.whenReady().then(() => {
  const iconPath = fs.existsSync(path.join(__dirname, '../resources/icon.png'))
    ? path.join(__dirname, '../resources/icon.png')
    : path.join(__dirname, '../public/icon.png');

  app.setAboutPanelOptions({
    applicationName: 'Daily Worklog',
    applicationVersion: app.getVersion() || '1.1.0',
    version: app.getVersion() || '1.1.0',
    copyright: 'Copyright © 2026 Daily Worklog',
    authors: ['Daily Worklog Team'],
    website: 'https://github.com/renefs/daily-worklogs',
    iconPath: iconPath,
    credits: 'Cross-platform desktop application to store, edit, and visualize daily worklogs using Markdown.',
  });

  setupApplicationMenu();

  // Handle worklog-media protocol for local vault images
  protocol.handle('worklog-media', async (request) => {
    try {
      const urlObj = new URL(request.url);
      const { vaultPath } = getSettings();
      let targetFilePath = '';

      if (urlObj.hostname === 'vault') {
        const subPath = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ''));
        targetFilePath = path.join(vaultPath, subPath);
      } else {
        let decodedPath = decodeURIComponent(urlObj.pathname);
        if (process.platform === 'win32' && decodedPath.startsWith('/')) {
          decodedPath = decodedPath.slice(1);
        }
        targetFilePath = decodedPath;
      }

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Task parsing helper
function parseTaskCounts(content: string) {
  const checked = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
  const unchecked = (content.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;
  return {
    tasksCompleted: checked,
    tasksTotal: checked + unchecked,
  };
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion() || '1.1.0';
});

ipcMain.handle('get-app-info', () => {
  return {
    name: 'Daily Worklog',
    version: app.getVersion() || '1.1.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    osRelease: `${os.type()} ${os.release()}`,
  };
});

ipcMain.handle('show-about-dialog', () => {
  showAbout();
  return { success: true };
});

ipcMain.handle('get-settings', () => {
  return getSettings();
});

ipcMain.handle('save-settings', (_event, partialSettings) => {
  const updated = saveSettings(partialSettings);
  if (updated.vaultPath) {
    ensureVaultDir(updated.vaultPath);
  }
  return updated;
});

ipcMain.handle('get-default-vault-path', () => {
  return defaultVaultPath;
});

ipcMain.handle('select-vault-directory', async () => {
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
    return selected;
  }
  return null;
});

ipcMain.handle('read-note', async (_event, date: string) => {
  const { vaultPath } = getSettings();
  ensureVaultDir(vaultPath);
  const { filepath, exists, filename, relativePath } = getNoteFilePath(vaultPath, date);

  if (exists) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const stat = fs.statSync(filepath);
    const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
    return {
      date,
      filename,
      filepath,
      relativePath,
      content,
      exists: true,
      lastModified: stat.mtime.toISOString(),
      tasksCompleted,
      tasksTotal,
    };
  }

  // If note doesn't exist yet, construct initial content from chosen default template
  const settings = getSettings();
  const template = settings.templates.find((t: any) => t.id === settings.defaultTemplateId) || settings.templates[0] || DEFAULT_TEMPLATES[0];
  const initialContent = formatTemplateContent(template.content, date, settings.dateFormat, settings.language);

  return {
    date,
    filename,
    filepath,
    relativePath,
    content: initialContent,
    exists: false,
    tasksCompleted: 0,
    tasksTotal: 0,
  };
});

ipcMain.handle('write-note', async (_event, date: string, content: string) => {
  const { vaultPath } = getSettings();
  const year = getYearFromDate(date);
  const yearDir = ensureYearDir(vaultPath, year);
  const filename = `${date}.md`;
  const filepath = path.join(yearDir, filename);

  fs.writeFileSync(filepath, content, 'utf-8');
  const stat = fs.statSync(filepath);

  return {
    success: true,
    filepath,
    relativePath: `${year}/${filename}`,
    lastModified: stat.mtime.toISOString(),
  };
});

ipcMain.handle('delete-note', async (_event, date: string) => {
  const { vaultPath } = getSettings();
  const year = getYearFromDate(date);
  const yearFilePath = path.join(vaultPath, year, `${date}.md`);
  const rootFilePath = path.join(vaultPath, `${date}.md`);

  let deleted = false;
  if (fs.existsSync(yearFilePath)) {
    fs.unlinkSync(yearFilePath);
    deleted = true;
  }
  if (fs.existsSync(rootFilePath)) {
    fs.unlinkSync(rootFilePath);
    deleted = true;
  }

  return { success: deleted };
});

ipcMain.handle('list-notes', async () => {
  const { vaultPath } = getSettings();
  ensureVaultDir(vaultPath);

  try {
    const dateRegex = /^\d{4}-\d{2}-\d{2}\.md$/;
    const noteFiles: Array<{ date: string; filename: string; filepath: string; relativePath: string; lastModified: string; size: number }> = [];
    const seenDates = new Set<string>();

    const rootEntries = fs.readdirSync(vaultPath, { withFileTypes: true });

    // 1. Scan year subdirectories (e.g. 2024, 2025, 2026)
    for (const entry of rootEntries) {
      if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
        const yearDir = path.join(vaultPath, entry.name);
        try {
          const yearFiles = fs.readdirSync(yearDir, { withFileTypes: true });
          for (const yearFile of yearFiles) {
            if (yearFile.isFile() && dateRegex.test(yearFile.name)) {
              const filepath = path.join(yearDir, yearFile.name);
              const stat = fs.statSync(filepath);
              const date = yearFile.name.replace('.md', '');
              seenDates.add(date);
              noteFiles.push({
                date,
                filename: yearFile.name,
                filepath,
                relativePath: `${entry.name}/${yearFile.name}`,
                lastModified: stat.mtime.toISOString(),
                size: stat.size,
              });
            }
          }
        } catch (subErr) {
          console.warn(`Error reading year folder ${entry.name}:`, subErr);
        }
      }
    }

    // 2. Scan vault root for direct date notes
    for (const entry of rootEntries) {
      if (entry.isFile() && dateRegex.test(entry.name)) {
        const date = entry.name.replace('.md', '');
        if (!seenDates.has(date)) {
          const filepath = path.join(vaultPath, entry.name);
          const stat = fs.statSync(filepath);
          seenDates.add(date);
          noteFiles.push({
            date,
            filename: entry.name,
            filepath,
            relativePath: entry.name,
            lastModified: stat.mtime.toISOString(),
            size: stat.size,
          });
        }
      }
    }

    return noteFiles.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error('Error listing notes:', err);
    return [];
  }
});

ipcMain.handle('get-notes-range', async (_event, startDate: string, endDate: string) => {
  const { vaultPath } = getSettings();
  ensureVaultDir(vaultPath);

  // Generate array of dates between start and end
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];
  let totalTasks = 0;
  let completedTasks = 0;
  let activeDays = 0;
  const allDailyChecklistItems: Array<{ date: string; text: string; completed: boolean }> = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const { filepath, exists } = getNoteFilePath(vaultPath, dateStr);

    if (exists) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
      totalTasks += tasksTotal;
      completedTasks += tasksCompleted;
      activeDays += 1;

      // Extract specific checklist items
      const checklistItems: Array<{ date: string; text: string; completed: boolean }> = [];
      const lines = content.split('\n');
      for (const line of lines) {
        const checkMatch = line.match(/^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/);
        if (checkMatch) {
          const isCheck = checkMatch[1].toLowerCase() === 'x';
          const itemText = checkMatch[2].trim();
          if (itemText.length > 0) {
            checklistItems.push({
              date: dateStr,
              text: itemText,
              completed: isCheck,
            });
            allDailyChecklistItems.push({
              date: dateStr,
              text: itemText,
              completed: isCheck,
            });
          }
        }
      }

      // Extract sections
      const sectionMatches = content.split(/(?=^##\s+)/m);
      const sections = sectionMatches.map((sec) => {
        const sLines = sec.trim().split('\n');
        const firstLine = sLines[0];
        const isHeader = firstLine.startsWith('#');
        const title = isHeader ? firstLine.replace(/^#+\s*/, '') : 'Overview';
        const body = isHeader ? sLines.slice(1).join('\n').trim() : sec.trim();
        return { title, body };
      }).filter(s => s.body.length > 0 || s.title !== 'Overview');

      days.push({
        date: dateStr,
        exists: true,
        content,
        tasksTotal,
        tasksCompleted,
        sections,
        checklistItems,
      });
    } else {
      days.push({
        date: dateStr,
        exists: false,
        content: '',
        tasksTotal: 0,
        tasksCompleted: 0,
        sections: [],
        checklistItems: [],
      });
    }
  }

  // Load and include standalone task documents from vault/tasks
  const periodTasks: any[] = [];
  const completedTasksList: any[] = [];
  const inProgressTasksList: any[] = [];
  const waitingTasksList: any[] = [];
  const backlogTasksList: any[] = [];
  const tagBreakdown: Record<string, { total: number; completed: number }> = {};
  const priorityBreakdown: Record<string, { total: number; completed: number }> = {
    urgent: { total: 0, completed: 0 },
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 },
  };

  try {
    const tasksDir = ensureTasksDir(vaultPath);
    if (fs.existsSync(tasksDir)) {
      const files = fs.readdirSync(tasksDir);
      const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));
      for (const file of mdFiles) {
        const filepath = path.join(tasksDir, file);
        const task = parseTaskFile(filepath, file);
        const createdDate = task.created || '';
        const dueDate = task.due || '';
        const startedDate = task.startedDate || '';
        const completedDate = task.completedDate || '';
        const modifiedDate = task.lastModified ? task.lastModified.split('T')[0] : '';

        // Accurate period inclusion check
        const taskBehavior = getColumnBehavior(task.status);
        const isDoneOrCancelled = taskBehavior === 'done' || taskBehavior === 'cancelled';
        const wasCompletedInPeriod = completedDate >= startDate && completedDate <= endDate;
        const wasStartedInPeriod = startedDate >= startDate && startedDate <= endDate;
        const wasDueInPeriod = dueDate >= startDate && dueDate <= endDate;
        const wasCreatedInPeriod = createdDate >= startDate && createdDate <= endDate;
        const wasActiveInPeriod = startedDate && startedDate <= endDate && (!isDoneOrCancelled || (completedDate && completedDate >= startDate));
        const wasModifiedInPeriod = modifiedDate >= startDate && modifiedDate <= endDate;

        const inRange =
          wasCompletedInPeriod ||
          wasStartedInPeriod ||
          wasDueInPeriod ||
          wasCreatedInPeriod ||
          wasActiveInPeriod ||
          wasModifiedInPeriod;

        if (inRange) {
          periodTasks.push(task);
          totalTasks += 1;
          if (isDoneOrCancelled) {
            completedTasks += 1;
          }

          // Categorized lists based on lifecycle behavior
          if (taskBehavior === 'done' || taskBehavior === 'cancelled') {
            completedTasksList.push(task);
          } else if (taskBehavior === 'in_progress') {
            inProgressTasksList.push(task);
          } else if (taskBehavior === 'waiting') {
            waitingTasksList.push(task);
          } else {
            backlogTasksList.push(task);
          }

          // Tag breakdown
          if (task.tags && task.tags.length > 0) {
            for (const tag of task.tags) {
              if (!tagBreakdown[tag]) {
                tagBreakdown[tag] = { total: 0, completed: 0 };
              }
              tagBreakdown[tag].total += 1;
              if (isDoneOrCancelled) {
                tagBreakdown[tag].completed += 1;
              }
            }
          }

          // Priority breakdown
          const p = task.priority || 'medium';
          if (!priorityBreakdown[p]) {
            priorityBreakdown[p] = { total: 0, completed: 0 };
          }
          priorityBreakdown[p].total += 1;
          if (isDoneOrCancelled) {
            priorityBreakdown[p].completed += 1;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error calculating tasks in range:', err);
  }

  return {
    startDate,
    endDate,
    title: `${startDate} to ${endDate}`,
    totalDays: days.length,
    activeDays,
    totalTasks,
    completedTasks,
    days,
    periodTasks,
    completedTasksList,
    inProgressTasksList,
    waitingTasksList,
    backlogTasksList,
    dailyChecklistItems: allDailyChecklistItems,
    tagBreakdown,
    priorityBreakdown,
  };
});



ipcMain.handle('export-document', async (_event, { title, defaultPath, content, format }) => {
  if (!mainWindow) return { success: false };

  const ext = format === 'html' ? 'html' : format === 'txt' ? 'txt' : 'md';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Export ${title}`,
    defaultPath: defaultPath || `${title}.${ext}`,
    filters: [
      { name: format.toUpperCase(), extensions: [ext] },
      { name: 'All Files', extensions: ['*'] },
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

    // Ensure the folder exists if it's a directory or does not exist yet
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

// Helper to parse a task file with frontmatter
function parseTaskFile(filepath: string, filename: string) {
  const rawContent = fs.readFileSync(filepath, 'utf-8');
  const stat = fs.statSync(filepath);
  const parsed = matter(rawContent);
  const data = parsed.data || {};

  // Fallback title: frontmatter title -> first markdown heading -> filename without extension
  let title = data.title;
  if (!title) {
    const headingMatch = parsed.content.match(/^#\s+(.+)$/m);
    title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
  }

  const status = data.status ? String(data.status).trim() : 'todo';

  const { tasksCompleted, tasksTotal } = parseTaskCounts(parsed.content);

  return {
    id: filename.replace(/\.md$/i, ''),
    filename,
    filepath,
    title,
    status,
    priority: data.priority || 'medium',
    created: data.created || stat.birthtime.toISOString().split('T')[0],
    due: data.due || undefined,
    startedDate: data.startedDate || undefined,
    completedDate: data.completedDate || undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    content: parsed.content.trim(),
    rawContent,
    lastModified: stat.mtime.toISOString(),
    frontmatter: data,
    checklistTotal: tasksTotal,
    checklistCompleted: tasksCompleted,
    activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
  };
}

// Task IPC Handlers
ipcMain.handle('list-tasks', async () => {
  const { vaultPath } = getSettings();
  const tasksDir = ensureTasksDir(vaultPath);
  try {
    const files = fs.readdirSync(tasksDir);
    const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));
    const tasks = mdFiles.map((file) => {
      const filepath = path.join(tasksDir, file);
      return parseTaskFile(filepath, file);
    });

    return tasks.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
  } catch (err) {
    console.error('Error listing tasks:', err);
    return [];
  }
});

ipcMain.handle('read-task', async (_event, filename: string) => {
  const { vaultPath } = getSettings();
  const tasksDir = ensureTasksDir(vaultPath);
  const safeFilename = filename.toLowerCase().endsWith('.md') ? filename : `${filename}.md`;
  const filepath = path.join(tasksDir, safeFilename);

  if (fs.existsSync(filepath)) {
    return parseTaskFile(filepath, safeFilename);
  }
  return null;
});

ipcMain.handle('write-task', async (_event, taskData: any) => {
  const { vaultPath } = getSettings();
  const tasksDir = ensureTasksDir(vaultPath);

  let filename = taskData.filename;
  if (!filename) {
    const slug = slugify(taskData.title) || 'task';
    const datePrefix = new Date().toISOString().split('T')[0];
    filename = `${datePrefix}-${slug}.md`;

    // Handle duplicate filenames
    let counter = 1;
    while (fs.existsSync(path.join(tasksDir, filename))) {
      filename = `${datePrefix}-${slug}-${counter}.md`;
      counter++;
    }
  } else if (!filename.toLowerCase().endsWith('.md')) {
    filename = `${filename}.md`;
  }

  const filepath = path.join(tasksDir, filename);
  let existingData: Record<string, any> = {};
  if (fs.existsSync(filepath)) {
    try {
      const existingRaw = fs.readFileSync(filepath, 'utf-8');
      existingData = matter(existingRaw).data || {};
    } catch (e) {
      console.warn('Could not read existing task frontmatter:', e);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const nextStatus = taskData.status || existingData.status || 'todo';
  const behavior = getColumnBehavior(nextStatus);
  const isDoneOrCancelled = behavior === 'done' || behavior === 'cancelled';
  const prevBehavior = existingData.status ? getColumnBehavior(existingData.status) : undefined;
  const wasDoneOrCancelled = prevBehavior === 'done' || prevBehavior === 'cancelled';

  let startedDate = taskData.startedDate !== undefined ? taskData.startedDate : existingData.startedDate;
  let completedDate = taskData.completedDate !== undefined ? taskData.completedDate : existingData.completedDate;

  // Auto-stamp startedDate when moving to in_progress if not already set
  if (behavior === 'in_progress' && !startedDate) {
    startedDate = todayStr;
  }
  // Auto-stamp completedDate when moving to done or cancelled
  if (isDoneOrCancelled && !completedDate) {
    completedDate = todayStr;
  } else if (!isDoneOrCancelled && taskData.completedDate === undefined && wasDoneOrCancelled) {
    // If moving away from done/cancelled, remove completedDate unless explicitly supplied
    completedDate = undefined;
  }

  const frontmatterData: Record<string, any> = {
    ...existingData,
    title: taskData.title,
    status: nextStatus,
    priority: taskData.priority || 'medium',
    created: taskData.created || existingData.created || todayStr,
    tags: Array.isArray(taskData.tags) ? taskData.tags : existingData.tags || [],
  };

  if (startedDate) {
    frontmatterData.startedDate = startedDate;
  } else {
    delete frontmatterData.startedDate;
  }

  if (completedDate) {
    frontmatterData.completedDate = completedDate;
  } else {
    delete frontmatterData.completedDate;
  }

  if (taskData.due) {
    frontmatterData.due = taskData.due;
  } else if ('due' in taskData && !taskData.due) {
    delete frontmatterData.due;
  }

  const content = taskData.content !== undefined ? taskData.content : '';
  const fileContent = matter.stringify(content, frontmatterData);

  fs.writeFileSync(filepath, fileContent, 'utf-8');
  const savedTask = parseTaskFile(filepath, filename);

  return { success: true, task: savedTask };
});

ipcMain.handle('update-task-status', async (_event, filename: string, status: string) => {
  const { vaultPath } = getSettings();
  const tasksDir = ensureTasksDir(vaultPath);
  const safeFilename = filename.toLowerCase().endsWith('.md') ? filename : `${filename}.md`;
  const filepath = path.join(tasksDir, safeFilename);

  if (!fs.existsSync(filepath)) {
    return { success: false, error: 'Task file not found' };
  }

  const rawContent = fs.readFileSync(filepath, 'utf-8');
  const parsed = matter(rawContent);
  const todayStr = new Date().toISOString().split('T')[0];

  const prevStatus = parsed.data.status || 'todo';
  const prevBehavior = getColumnBehavior(prevStatus);
  const nextBehavior = getColumnBehavior(status);
  const isDoneOrCancelled = nextBehavior === 'done' || nextBehavior === 'cancelled';
  const wasDoneOrCancelled = prevBehavior === 'done' || prevBehavior === 'cancelled';

  const updatedData: Record<string, any> = {
    ...parsed.data,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (isDoneOrCancelled && !updatedData.completedDate) {
    updatedData.completedDate = todayStr;
  } else if (!isDoneOrCancelled && wasDoneOrCancelled) {
    delete updatedData.completedDate;
  }

  if (nextBehavior === 'in_progress' && !updatedData.startedDate) {
    updatedData.startedDate = todayStr;
  }

  const updatedRaw = matter.stringify(parsed.content, updatedData);
  fs.writeFileSync(filepath, updatedRaw, 'utf-8');
  const savedTask = parseTaskFile(filepath, safeFilename);

  return { success: true, task: savedTask };
});

ipcMain.handle('delete-task', async (_event, filename: string) => {
  const { vaultPath } = getSettings();
  const tasksDir = ensureTasksDir(vaultPath);
  const safeFilename = filename.toLowerCase().endsWith('.md') ? filename : `${filename}.md`;
  const filepath = path.join(tasksDir, safeFilename);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('log-task-to-daily-note', async (_event, { date, taskTitle, status, priority, filename }) => {
  const { vaultPath } = getSettings();
  const targetDate = date || new Date().toISOString().split('T')[0];
  const year = getYearFromDate(targetDate);
  const yearDir = ensureYearDir(vaultPath, year);
  const filepath = path.join(yearDir, `${targetDate}.md`);

  let content = '';
  if (fs.existsSync(filepath)) {
    content = fs.readFileSync(filepath, 'utf-8');
  } else {
    const settings = getSettings();
    const template =
      settings.templates.find((t: any) => t.id === settings.defaultTemplateId) ||
      settings.templates[0] ||
      DEFAULT_TEMPLATES[0];
    content = formatTemplateContent(template.content, targetDate, settings.dateFormat, settings.language);
  }

  const behavior = getColumnBehavior(status);
  const isDone = behavior === 'done' || behavior === 'cancelled';
  const checkbox = isDone ? '- [x]' : '- [ ]';
  const statusBadge = behavior === 'cancelled' ? ' [Cancelled]' : '';
  const priorityStr = priority ? ` [${priority}]` : '';
  const fileStr = filename ? ` (\`${filename}\`)` : '';
  const logLine = `${checkbox} Worked on **${taskTitle}**${statusBadge}${priorityStr}${fileStr}`;

  // If not already in content, insert appropriately
  if (!content.includes(taskTitle)) {
    if (isDone && content.includes('## ✅ Accomplishments')) {
      content = content.replace(/(## ✅ Accomplishments[^\n]*\n)/, `$1${logLine}\n`);
    } else if (!isDone && content.includes('## ⏳ In Progress')) {
      content = content.replace(/(## ⏳ In Progress[^\n]*\n)/, `$1${logLine}\n`);
    } else if (content.includes('## 🎯 Today\'s Goals')) {
      content = content.replace(/(## 🎯 Today\'s Goals[^\n]*\n)/, `$1${logLine}\n`);
    } else if (content.includes('## Tasks')) {
      content = content.replace(/(## Tasks[^\n]*\n)/, `$1${logLine}\n`);
    } else {
      content = `${content.trim()}\n\n### 📋 Task Log\n${logLine}\n`;
    }
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  return { success: true };
});

// Image IPC Handlers
ipcMain.handle('save-image', async (_event, payload: {
  sourcePath?: string;
  buffer?: ArrayBuffer | Uint8Array;
  base64Data?: string;
  originalName?: string;
  mimeType?: string;
}) => {
  try {
    const { vaultPath } = getSettings();
    const imagesDir = ensureImagesDir(vaultPath);
    const filename = generateUniqueImageFilename(imagesDir, payload.originalName, payload.mimeType);
    const destPath = path.join(imagesDir, filename);

    if (payload.sourcePath && fs.existsSync(payload.sourcePath)) {
      fs.copyFileSync(payload.sourcePath, destPath);
    } else if (payload.buffer) {
      const buf = Buffer.from(payload.buffer as any);
      fs.writeFileSync(destPath, buf);
    } else if (payload.base64Data) {
      const cleanBase64 = payload.base64Data.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
      const buf = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(destPath, buf);
    } else {
      return { success: false, error: 'No image data provided' };
    }

    return {
      success: true,
      filename,
      relativePath: `images/${filename}`,
      fullPath: destPath,
      url: `worklog-media://vault/images/${filename}`,
    };
  } catch (err: any) {
    console.error('Error saving image:', err);
    return { success: false, error: err?.message || 'Failed to save image' };
  }
});

ipcMain.handle('select-image-dialog', async () => {
  if (!mainWindow) return { success: false, error: 'No window available' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const sourcePath = result.filePaths[0];
    const originalName = path.basename(sourcePath);
    const { vaultPath } = getSettings();
    const imagesDir = ensureImagesDir(vaultPath);
    const filename = generateUniqueImageFilename(imagesDir, originalName);
    const destPath = path.join(imagesDir, filename);
    fs.copyFileSync(sourcePath, destPath);

    return {
      success: true,
      filename,
      relativePath: `images/${filename}`,
      fullPath: destPath,
      url: `worklog-media://vault/images/${filename}`,
    };
  }
  return { success: false, canceled: true };
});

ipcMain.handle('resolve-media-url', (_event, relativeOrAbsPath: string) => {
  if (!relativeOrAbsPath) return '';
  if (
    /^https?:\/\//i.test(relativeOrAbsPath) ||
    relativeOrAbsPath.startsWith('data:') ||
    relativeOrAbsPath.startsWith('worklog-media://')
  ) {
    return relativeOrAbsPath;
  }
  const clean = relativeOrAbsPath.replace(/^\.?\/+/, '');
  return `worklog-media://vault/${clean}`;
});



