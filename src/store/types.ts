import { StateCreator } from 'zustand';
import type { AppInfo } from '../types/electron';
import {
  AppSettings,
  AppViewMode,
  AreaDefinition,
  DailyNote,
  DailyNoteMeta,
  DailyRoutine,
  ProjectDefinition,
  PeriodSummary,
  ReportPeriod,
  ReportTab,
  SettingsSectionId,
  TagDefinition,
  TaskItem,
  TaskMeta,
  TaskPriority,
  TaskStatus,
} from '../types';

export interface UiSlice {
  currentView: AppViewMode;
  selectedDate: string; // YYYY-MM-DD
  isLoading: boolean;
  /** Section shown by the Settings view; remembered between visits. */
  settingsActiveTab: SettingsSectionId;
  /** View to return to when leaving Settings. Kept apart from previousView, which belongs to the task editor. */
  settingsReturnView: AppViewMode;
  isOnboardingOpen: boolean;
  isSidebarCollapsed: boolean;
  /** Static build and runtime details, loaded once at startup for the About section. */
  appInfo: AppInfo | null;

  initApp: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setCurrentView: (view: AppViewMode) => Promise<void>;
  /**
   * Opens the Settings view, flushing pending edits first. Without a section the last one is shown.
   * Does nothing when navigation is refused (for example a task draft that cannot be saved).
   */
  openSettings: (tab?: SettingsSectionId) => Promise<void>;
  /** Leaves Settings for the view it was opened from. */
  closeSettings: () => Promise<void>;
  setSettingsActiveTab: (tab: SettingsSectionId) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  completeOnboarding: (partial?: Partial<AppSettings>) => Promise<void>;
  toggleSidebarCollapse: (collapsed?: boolean) => void;
  openExternalUrl: (url: string) => Promise<void>;
}

export interface SettingsSlice {
  settings: AppSettings | null;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  /** Re-reads settings and every vault-backed list (notes, tasks, tags, routine completions). */
  reloadVaultData: () => Promise<void>;
  /** Opens the folder picker and, when a vault was chosen, reloads all vault data. Resolves to the new path. */
  changeVault: () => Promise<string | null>;
}

export interface NotesSlice {
  activeNote: DailyNote | null;
  isSaving: boolean;
  isDirty: boolean;
  noteSaveError: string | null;
  externalNoteConflict: { date: string; content: string; lastModified?: string; exists: boolean } | null;
  notesList: DailyNoteMeta[];

  loadNoteForDate: (date: string) => Promise<void>;
  setNoteContent: (content: string) => void;
  saveActiveNote: (options?: { force?: boolean }) => Promise<boolean>;
  handleExternalNoteChange: (change: { date: string; content: string; lastModified?: string; exists: boolean }) => void;
  acceptExternalNote: () => void;
  keepLocalNote: () => Promise<void>;
  deleteActiveNote: (date?: string) => Promise<void>;
  refreshNotesList: () => Promise<void>;
  toggleTaskInNote: (taskText: string, checked: boolean) => void;
}

export interface TasksSlice {
  tasks: TaskMeta[];
  activeTask: TaskItem | null;
  isTaskModalOpen: boolean;
  taskModalInitialStatus: TaskStatus;
  isTasksLoading: boolean;
  previousView: AppViewMode;
  taskEditorLayoutMode: 'live' | 'split' | 'edit' | 'preview';
  isTaskPropertiesPanelOpen: boolean;
  isTaskSaving: boolean;
  isTaskDirty: boolean;

  refreshTasksList: () => Promise<void>;
  createOrUpdateTask: (taskData: {
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
  }) => Promise<TaskItem | null>;
  updateTaskStatus: (filename: string, status: TaskStatus) => Promise<void>;
  /**
   * Moves several tasks to other statuses through the regular task-status update path.
   * Resolves to true only when every task now has its requested status.
   */
  moveTasksToStatus: (moves: Array<{ filename: string; status: TaskStatus }>) => Promise<boolean>;
  deleteTask: (filename: string) => Promise<void>;
  logTaskToDailyNote: (task: TaskMeta | { title: string; status: TaskStatus; priority?: TaskPriority; filename?: string; taskId?: number }, targetDate?: string) => Promise<boolean>;
  openTaskModal: (task?: TaskMeta | TaskItem | Partial<TaskItem> | null, defaultStatus?: TaskStatus) => void;
  closeTaskModal: () => void;
  openTaskEditor: (task?: TaskMeta | TaskItem | Partial<TaskItem> | null, defaultStatus?: TaskStatus, returnView?: AppViewMode) => Promise<void>;
  closeTaskEditor: () => void;
  setActiveTask: (task: TaskItem | null) => void;
  setTaskEditorLayoutMode: (mode: 'live' | 'split' | 'edit' | 'preview') => void;
  toggleTaskPropertiesPanel: () => void;
  setTaskDirty: (isDirty: boolean) => void;
}

export interface AreasProjectsSlice {
  areas: AreaDefinition[];
  projects: ProjectDefinition[];

  saveArea: (area: AreaDefinition, oldName?: string) => Promise<void>;
  deleteArea: (areaIdOrName: string) => Promise<void>;
  saveProject: (project: ProjectDefinition, oldName?: string, oldAreaName?: string) => Promise<void>;
  deleteProject: (projectIdOrName: string) => Promise<void>;
}

export interface TagsSlice {
  allTags: TagDefinition[];

  refreshTagsList: () => Promise<void>;
  saveTagDefinition: (tagDef: TagDefinition) => Promise<void>;
  renameTag: (oldName: string, newName: string) => Promise<number>;
  deleteTag: (tagName: string, removeFromTasks?: boolean) => Promise<number>;
}

export interface RoutinesSlice {
  isRoutinesDrawerOpen: boolean;
  routineCompletionsByDate: Record<string, string[]>;

  toggleRoutineCompletion: (date: string, routineId: string) => Promise<void>;
  loadRoutineCompletions: (date: string) => Promise<void>;
  completeAllDailyRoutines: (date: string, routineIds: string[]) => Promise<void>;
  resetDailyRoutines: (date: string) => Promise<void>;
  saveRoutinesList: (routines: DailyRoutine[]) => Promise<void>;
  toggleRoutinesDrawer: (open?: boolean) => void;
}

export interface ReportsSlice {
  reportDate: string;
  reportPeriod: ReportPeriod;
  reportTab: ReportTab;
  reportDaysExpanded: boolean;
  hasOpenedReports: boolean;
  reportSummary: PeriodSummary | null;
  isReportLoading: boolean;
  reportError: string | null;
  setReportDate: (date: string) => void;
  setReportTab: (tab: ReportTab) => void;
  setReportDaysExpanded: (expanded: boolean) => void;
  openReports: (period?: ReportPeriod, date?: string) => Promise<void>;
  openReportDay: (date: string) => Promise<void>;
  readReportDay: (date: string) => Promise<string>;
  refreshReport: () => Promise<void>;
}

export type AppState = UiSlice &
  ReportsSlice &
  SettingsSlice &
  NotesSlice &
  TasksSlice &
  AreasProjectsSlice &
  TagsSlice &
  RoutinesSlice;

export type AppSlice<T> = StateCreator<AppState, [], [], T>;

