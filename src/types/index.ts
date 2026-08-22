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

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'waiting' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskActivityEntry {
  date: string;
  action: string;
  note?: string;
}

export interface TaskItem {
  id: string; // Filename or identifier without extension
  filename: string; // e.g. "my-task.md"
  filepath: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  created: string; // YYYY-MM-DD
  due?: string; // YYYY-MM-DD
  startedDate?: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD
  tags?: string[];
  content: string; // Markdown body
  rawContent?: string;
  lastModified?: string;
  frontmatter?: Record<string, any>;
  checklistTotal?: number;
  checklistCompleted?: number;
  activityLog?: TaskActivityEntry[];
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

export type AppViewMode = 'daily' | 'weekly' | 'monthly' | 'calendar' | 'tasks' | 'settings';

export interface DailyChecklistItem {
  date: string;
  text: string;
  completed: boolean;
}

export interface WorklogDaySummary {
  date: string;
  exists: boolean;
  content: string;
  tasksTotal: number;
  tasksCompleted: number;
  sections: Array<{ title: string; body: string }>;
  checklistItems?: DailyChecklistItem[];
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
  periodTasks?: TaskItem[];
  completedTasksList?: TaskItem[];
  inProgressTasksList?: TaskItem[];
  waitingTasksList?: TaskItem[];
  backlogTasksList?: TaskItem[];
  dailyChecklistItems?: DailyChecklistItem[];
  tagBreakdown?: Record<string, { total: number; completed: number }>;
  priorityBreakdown?: Record<string, { total: number; completed: number }>;
}
