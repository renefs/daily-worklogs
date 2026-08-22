import { AppSettings, DailyNote, PeriodSummary } from './index';

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
  exportDocument: (payload: { title: string; defaultPath: string; content: string; format: 'md' | 'html' | 'txt' }) => Promise<{ success: boolean; filePath?: string }>;
  openInFileManager: (filePath?: string) => Promise<void>;
  onNoteFileChanged: (callback: (data: { date: string; content: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
