import { AppSettings, DailyNote, DailyNoteMeta, PeriodSummary, TaskItem, TaskPriority, TaskStatus } from './index';

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  v8?: string;
  platform: string;
  arch: string;
  osRelease?: string;
}

export interface ElectronAPI {
  platform?: string;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  selectVaultDirectory: () => Promise<string | null>;
  getDefaultVaultPath: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getAppInfo: () => Promise<AppInfo>;
  showAboutDialog: () => Promise<{ success: boolean }>;
  readNote: (date: string) => Promise<DailyNote>;
  writeNote: (date: string, content: string) => Promise<{ success: boolean; filepath: string; lastModified: string }>;
  deleteNote: (date: string) => Promise<{ success: boolean }>;
  listNotes: () => Promise<DailyNoteMeta[]>;
  getNotesRange: (startDate: string, endDate: string) => Promise<PeriodSummary>;
  listTasks: () => Promise<TaskItem[]>;
  readTask: (filename: string) => Promise<TaskItem | null>;
  writeTask: (task: {
    filename?: string;
    title: string;
    status: TaskStatus;
    priority?: TaskPriority;
    created?: string;
    due?: string;
    startedDate?: string;
    completedDate?: string;
    tags?: string[];
    content: string;
  }) => Promise<{ success: boolean; task: TaskItem }>;
  updateTaskStatus: (filename: string, status: TaskStatus) => Promise<{ success: boolean; task: TaskItem }>;
  deleteTask: (filename: string) => Promise<{ success: boolean }>;
  exportDocument: (payload: { title: string; defaultPath: string; content: string; format: 'md' | 'html' | 'txt' }) => Promise<{ success: boolean; filePath?: string }>;
  openInFileManager: (filePath?: string) => Promise<void>;
  openExternalUrl: (url: string) => Promise<{ success: boolean }>;
  logTaskToDailyNote: (payload: { date?: string; taskTitle: string; status: string; priority?: string; filename?: string }) => Promise<{ success: boolean }>;
  saveImage: (payload: {
    sourcePath?: string;
    buffer?: ArrayBuffer | Uint8Array;
    base64Data?: string;
    originalName?: string;
    mimeType?: string;
  }) => Promise<{
    success: boolean;
    relativePath?: string;
    fullPath?: string;
    filename?: string;
    url?: string;
    error?: string;
  }>;
  selectImageDialog: () => Promise<{
    success: boolean;
    relativePath?: string;
    fullPath?: string;
    filename?: string;
    url?: string;
    canceled?: boolean;
    error?: string;
  }>;
  resolveMediaUrl: (path: string) => Promise<string>;
  onNoteFileChanged: (callback: (data: { date: string; content: string }) => void) => () => void;
  onOpenSettings?: (callback: (tab?: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

