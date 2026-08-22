export interface DailyNote {
  date: string; // 'YYYY-MM-DD'
  filename: string;
  filepath: string;
  content: string;
  exists: boolean;
  lastModified?: string;
  frontmatter?: Record<string, any>;
  tasksTotal?: number;
  tasksCompleted?: number;
}

export type WeekStartDay = 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday

export interface NoteTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export interface AppSettings {
  vaultPath: string;
  language: 'en' | 'es';
  themeColor: string;
  colorScheme: 'light' | 'dark' | 'auto';
  weekStartDay: WeekStartDay;
  defaultTemplateId: string;
  templates: NoteTemplate[];
  autoSave: boolean;
  autoSaveDelay: number; // in ms
  dateFormat: string;
  editorFontSize: number;
}

export type AppViewMode = 'daily' | 'weekly' | 'monthly' | 'calendar' | 'settings';

export interface WorklogDaySummary {
  date: string;
  exists: boolean;
  content: string;
  tasksTotal: number;
  tasksCompleted: number;
  sections: Array<{ title: string; body: string }>;
}

export interface PeriodSummary {
  startDate: string;
  endDate: string;
  title: string;
  totalDays: number;
  activeDays: number;
  totalTasks: number;
  completedTasks: number;
  days: WorklogDaySummary[];
}
