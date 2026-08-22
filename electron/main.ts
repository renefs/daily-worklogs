import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  autoSave: true,
  autoSaveDelay: 1000,
  dateFormat: 'YYYY-MM-DD',
  editorFontSize: 15,
};

function getSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(newSettings: any) {
  try {
    const current = getSettings();
    const merged = { ...current, ...newSettings };
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');
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

function createWindow() {
  const settings = getSettings();
  ensureVaultDir(settings.vaultPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'Daily Worklog',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

// App lifecycle
app.whenReady().then(() => {
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
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Worklog Vault Folder',
    defaultPath: getSettings().vaultPath,
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selected = result.filePaths[0];
    saveSettings({ vaultPath: selected });
    return selected;
  }
  return null;
});

ipcMain.handle('read-note', async (_event, date: string) => {
  const { vaultPath, templates, defaultTemplateId } = getSettings();
  ensureVaultDir(vaultPath);
  const filename = `${date}.md`;
  const filepath = path.join(vaultPath, filename);

  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const stat = fs.statSync(filepath);
    const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
    return {
      date,
      filename,
      filepath,
      content,
      exists: true,
      lastModified: stat.mtime.toISOString(),
      tasksCompleted,
      tasksTotal,
    };
  }

  // If note doesn't exist yet, construct initial content from chosen default template
  const template = templates.find((t: any) => t.id === defaultTemplateId) || templates[0] || DEFAULT_TEMPLATES[0];
  const initialContent = template.content.replace(/\{\{date\}\}/g, date);

  return {
    date,
    filename,
    filepath,
    content: initialContent,
    exists: false,
    tasksCompleted: 0,
    tasksTotal: 0,
  };
});

ipcMain.handle('write-note', async (_event, date: string, content: string) => {
  const { vaultPath } = getSettings();
  ensureVaultDir(vaultPath);
  const filename = `${date}.md`;
  const filepath = path.join(vaultPath, filename);

  fs.writeFileSync(filepath, content, 'utf-8');
  const stat = fs.statSync(filepath);

  return {
    success: true,
    filepath,
    lastModified: stat.mtime.toISOString(),
  };
});

ipcMain.handle('delete-note', async (_event, date: string) => {
  const { vaultPath } = getSettings();
  const filepath = path.join(vaultPath, `${date}.md`);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('list-notes', async () => {
  const { vaultPath } = getSettings();
  ensureVaultDir(vaultPath);

  try {
    const files = fs.readdirSync(vaultPath);
    const dateRegex = /^\d{4}-\d{2}-\d{2}\.md$/;
    const noteFiles = files
      .filter((file) => dateRegex.test(file))
      .map((file) => {
        const filepath = path.join(vaultPath, file);
        const stat = fs.statSync(filepath);
        const date = file.replace('.md', '');
        return {
          date,
          filename: file,
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return noteFiles;
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

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const filepath = path.join(vaultPath, `${dateStr}.md`);
    
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
      totalTasks += tasksTotal;
      completedTasks += tasksCompleted;
      activeDays += 1;

      // Extract sections
      const sectionMatches = content.split(/(?=^##\s+)/m);
      const sections = sectionMatches.map((sec) => {
        const lines = sec.trim().split('\n');
        const firstLine = lines[0];
        const isHeader = firstLine.startsWith('#');
        const title = isHeader ? firstLine.replace(/^#+\s*/, '') : 'Overview';
        const body = isHeader ? lines.slice(1).join('\n').trim() : sec.trim();
        return { title, body };
      }).filter(s => s.body.length > 0 || s.title !== 'Overview');

      days.push({
        date: dateStr,
        exists: true,
        content,
        tasksTotal,
        tasksCompleted,
        sections,
      });
    } else {
      days.push({
        date: dateStr,
        exists: false,
        content: '',
        tasksTotal: 0,
        tasksCompleted: 0,
        sections: [],
      });
    }
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
  const { vaultPath } = getSettings();
  const folderToOpen = targetPath || vaultPath;
  if (fs.existsSync(folderToOpen)) {
    shell.showItemInFolder(folderToOpen);
  }
});
