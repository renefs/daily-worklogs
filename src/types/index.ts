export interface DailyNote {
  date: string; // 'YYYY-MM-DD'
  filename: string;
  filepath: string;
  relativePath?: string;
  content: string;
  exists: boolean;
  lastModified?: string;
  frontmatter?: Record<string, any>;
  tasksTotal?: number;
  tasksCompleted?: number;
}

export interface DailyNoteMeta {
  date: string;
  filename: string;
  filepath?: string;
  relativePath?: string;
  lastModified: string;
  size: number;
}

export type ColumnBehavior = 'backlog' | 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled';

export interface KanbanColumnConfig {
  id: string; // unique status id, e.g. "backlog", "todo", "in_progress", "waiting", "done", "cancelled", etc.
  title: string;
  titleKey?: string;
  color: string;
  iconName?: string;
  visible: boolean;
  behavior: ColumnBehavior;
  isCustom?: boolean;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
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

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'waiting' | 'done' | string;

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

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday

export interface NoteTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export type RoutineSchedule = 'everyday' | 'weekdays' | number[]; // [0..6] for Sun..Sat

export interface DailyRoutine {
  id: string;
  title: string;
  description?: string;
  url?: string;
  schedule: RoutineSchedule;
  enabled: boolean;
}

export interface AppSettings {
  vaultPath: string;
  language: 'en' | 'es';
  themeColor: string;
  colorScheme: 'light' | 'dark' | 'auto';
  weekStartDay: WeekStartDay;
  defaultTemplateId: string;
  templates: NoteTemplate[];
  kanbanColumns?: KanbanColumnConfig[];
  autoSave: boolean;
  autoSaveDelay: number; // in ms
  dateFormat: string;
  editorFontSize: number;
  hideCompletedOlderThan30Days?: boolean;
  routines?: DailyRoutine[];
  routineCompletions?: Record<string, string[]>; // 'YYYY-MM-DD' -> routine ids completed on that date
  showDailyRoutinesPanel?: boolean;
  hasCompletedOnboarding?: boolean;
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
