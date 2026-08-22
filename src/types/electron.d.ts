import { AppSettings, DailyNote, PeriodSummary, TaskItem, TaskPriority, TaskStatus } from './index';

export interface ElectronAPI {
  platform?: string;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  selectVaultDirectory: () => Promise<string | null>;
  getDefaultVaultPath: () => Promise<string>;
  readNote: (date: string) => Promise<DailyNote>;
  writeNote: (date: string, content: string) => Promise<{ success: boolean; filepath: string; lastModified: string }>;
  deleteNote: (date: string) => Promise<{ success: boolean }>;
  listNotes: () => Promise<Array<{ date: string; filename: string; lastModified: string; size: number }>>;
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
  logTaskToDailyNote: (payload: { date?: string; taskTitle: string; status: string; priority?: string; filename?: string }) => Promise<{ success: boolean }>;
  onNoteFileChanged: (callback: (data: { date: string; content: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

