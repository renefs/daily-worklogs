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

export interface TaskMeta {
  id: string; // Filename or identifier without extension
  taskId?: number; // Auto-assigned sequential integer ID (e.g. 1, 2, 3...)
  filename: string; // e.g. "my-task.md"
  filepath: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  area?: string; // Area / Service container (e.g. "Webcast", "VC", "ASR")
  project?: string; // Project name (e.g. "Migración Wowza")
  created: string; // YYYY-MM-DD
  due?: string; // YYYY-MM-DD
  startedDate?: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD
  tags?: string[];
  parent?: number; // taskId of the parent task (subtask relationship)
  lastModified?: string;
  checklistTotal?: number;
  checklistCompleted?: number;
}

export interface TaskItem extends TaskMeta {
  content: string; // Markdown body, loaded only for the active task or detailed reports
  rawContent?: string;
  frontmatter?: Record<string, any>;
  activityLog?: TaskActivityEntry[];
}

export interface TaskWriteInput {
  id?: string;
  taskId?: number;
  filename?: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  area?: string;
  project?: string;
  created?: string;
  due?: string;
  startedDate?: string;
  completedDate?: string;
  tags?: string[];
  parent?: number;
  content: string;
}

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday

export type RoutineSchedule = 'everyday' | 'weekdays' | number[]; // [0..6] for Sun..Sat

export interface DailyRoutine {
  id: string;
  title: string;
  description?: string;
  url?: string;
  schedule: RoutineSchedule;
  enabled: boolean;
}

export interface AreaDefinition {
  id: string;
  name: string; // e.g. "Webcast", "VC", "ASR"
  color?: string; // Mantine color string or hex
  icon?: string; // Tabler icon name e.g. "video", "broadcast", "device-tv", "folder"
  description?: string;
  defaultTags?: string[]; // Tags inherited automatically by all tasks inside this area
}

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived';

export interface ProjectDefinition {
  id: string;
  name: string; // e.g. "Migración Wowza", "Renovación Sala 1"
  areaName: string; // Parent Area name (e.g. "Webcast")
  description?: string;
  color?: string;
  targetDate?: string; // YYYY-MM-DD (finite goal)
  status?: ProjectStatus;
  tags?: string[];
}

export interface TagDefinition {
  name: string; // e.g. "auth/oauth", "billing/stripe", "infra"
  color?: string; // Mantine color string, e.g. 'teal', 'blue', 'indigo', 'violet', 'orange', 'cyan', 'grape', 'red', 'pink' or hex
  description?: string;
}

export interface AppSettings {
  vaultPath: string;
  language: 'en' | 'es';
  themeColor: string;
  colorScheme: 'light' | 'dark' | 'auto';
  weekStartDay: WeekStartDay;
  kanbanColumns?: KanbanColumnConfig[];
  autoSave: boolean;
  autoSaveDelay: number; // in ms
  editorFontSize: number;
  closedTasksWindowDays?: number | null; // Recent window for closed Kanban columns; null = All
  enableDailyRoutines?: boolean;
  routines?: DailyRoutine[];
  showDailyRoutinesPanel?: boolean;
  hasCompletedOnboarding?: boolean;
  tags?: TagDefinition[];
  areas?: AreaDefinition[];
  projects?: ProjectDefinition[];
}

export type ReportPeriod = 'week' | 'month' | 'year';
export type ReportTab = 'dashboard' | 'days' | 'tasks';

export type AppViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'tasks' | 'task' | 'settings';

export interface DailyChecklistItem {
  date: string;
  text: string;
  completed: boolean;
}

export interface WorklogDaySummary {
  date: string;
  exists: boolean;
  content?: string;
  tasksTotal: number;
  tasksCompleted: number;
  sections?: Array<{ title: string; body: string }>;
  checklistItems?: DailyChecklistItem[];
}

export interface ServiceProjectMetric {
  total: number;
  completed: number;
  inProgress: number;
}

export interface ServiceBreakdownItem {
  service: string;
  total: number;
  completed: number;
  inProgress: number;
  projects: Record<string, ServiceProjectMetric>;
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
  periodTaskCount?: number;
  completedTasksList?: TaskMeta[];
  inProgressTasksList?: TaskMeta[];
  waitingTasksList?: TaskMeta[];
  backlogTasksList?: TaskMeta[];
  dailyChecklistItems?: DailyChecklistItem[];
  tagBreakdown?: Record<string, { total: number; completed: number; inProgress?: number }>;
  priorityBreakdown?: Record<string, { total: number; completed: number }>;
  serviceBreakdown?: Record<string, ServiceBreakdownItem>;
  projectBreakdown?: Record<string, ServiceProjectMetric & { service: string; project: string }>;
}

export interface VaultSearchResult {
  type: 'note' | 'task';
  id: string; // date 'YYYY-MM-DD' or task filename
  title: string;
  snippet: string;
  line?: number;
  tags?: string[];
  status?: string;
  taskId?: number;
}
