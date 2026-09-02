import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { AppSettings, AppViewMode, AreaDefinition, DailyNote, DailyNoteMeta, DailyRoutine, DEFAULT_KANBAN_COLUMNS, ProjectDefinition, TagDefinition, TaskItem, TaskMeta, TaskPriority, TaskStatus } from '../types';
import i18n, { getSystemLanguage } from '../i18n';
import { formatTemplateContent } from '../utils/dateTemplate';
import { DEFAULT_AREAS } from '../utils/areaProjectUtils';

dayjs.extend(isoWeek);

let notesRefreshGeneration = 0;
let notesRefreshInFlight: { generation: number; promise: Promise<DailyNoteMeta[]> } | null = null;
let tasksRefreshGeneration = 0;
let tasksRefreshInFlight: { generation: number; promise: Promise<TaskMeta[]> } | null = null;
let noteEditRevision = 0;

function invalidateNotesRefresh(): void {
  notesRefreshGeneration += 1;
  notesRefreshInFlight = null;
}

function invalidateTasksRefresh(): void {
  tasksRefreshGeneration += 1;
  tasksRefreshInFlight = null;
}

interface AppState {
  settings: AppSettings | null;
  currentView: AppViewMode;
  selectedDate: string; // YYYY-MM-DD
  activeNote: DailyNote | null;
  isSaving: boolean;
  isDirty: boolean;
  externalNoteConflict: { date: string; content: string; lastModified?: string; exists: boolean } | null;
  notesList: DailyNoteMeta[];
  isSettingsOpen: boolean;
  settingsActiveTab: string;
  isLoading: boolean;
  isOnboardingOpen: boolean;
  isSidebarCollapsed: boolean;

  // Tasks state
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

  // Areas & Projects state
  areas: AreaDefinition[];
  projects: ProjectDefinition[];

  // Tags state
  allTags: TagDefinition[];

  // Routines state
  isManageRoutinesModalOpen: boolean;
  routineCompletionsByDate: Record<string, string[]>;

  // Actions
  initApp: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setCurrentView: (view: AppViewMode) => void;
  loadNoteForDate: (date: string) => Promise<void>;
  setNoteContent: (content: string) => void;
  saveActiveNote: () => Promise<void>;
  handleExternalNoteChange: (change: { date: string; content: string; lastModified?: string; exists: boolean }) => void;
  acceptExternalNote: () => void;
  keepLocalNote: () => Promise<void>;
  deleteActiveNote: (date?: string) => Promise<void>;
  refreshNotesList: () => Promise<void>;
  applyTemplate: (templateId: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  openSettings: (tab?: string) => void;
  setSettingsActiveTab: (tab: string) => void;
  toggleTaskInNote: (taskText: string, checked: boolean) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  completeOnboarding: (partial?: Partial<AppSettings>) => Promise<void>;
  toggleSidebarCollapse: (collapsed?: boolean) => void;

  // Tag actions
  refreshTagsList: () => Promise<void>;
  saveTagDefinition: (tagDef: TagDefinition) => Promise<void>;
  renameTag: (oldName: string, newName: string) => Promise<number>;
  deleteTag: (tagName: string, removeFromTasks?: boolean) => Promise<number>;

  // Area & Project actions
  saveArea: (area: AreaDefinition, oldName?: string) => Promise<void>;
  deleteArea: (areaIdOrName: string) => Promise<void>;
  saveProject: (project: ProjectDefinition, oldName?: string, oldAreaName?: string) => Promise<void>;
  deleteProject: (projectIdOrName: string) => Promise<void>;

  // Task actions
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
    content: string;
  }) => Promise<TaskItem | null>;
  updateTaskStatus: (filename: string, status: TaskStatus) => Promise<void>;
  deleteTask: (filename: string) => Promise<void>;
  logTaskToDailyNote: (task: TaskMeta, targetDate?: string) => Promise<boolean>;
  openTaskModal: (task?: TaskMeta | TaskItem | null, defaultStatus?: TaskStatus) => void;
  closeTaskModal: () => void;
  openTaskEditor: (task?: TaskMeta | TaskItem | null, defaultStatus?: TaskStatus, returnView?: AppViewMode) => void;
  closeTaskEditor: () => void;
  setActiveTask: (task: TaskItem | null) => void;
  setTaskEditorLayoutMode: (mode: 'live' | 'split' | 'edit' | 'preview') => void;
  toggleTaskPropertiesPanel: () => void;
  setTaskDirty: (isDirty: boolean) => void;

  // Routine actions
  toggleRoutineCompletion: (date: string, routineId: string) => Promise<void>;
  loadRoutineCompletions: (date: string) => Promise<void>;
  completeAllDailyRoutines: (date: string, routineIds: string[]) => Promise<void>;
  resetDailyRoutines: (date: string) => Promise<void>;
  saveRoutinesList: (routines: DailyRoutine[]) => Promise<void>;
  toggleDailyRoutinesPanel: () => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
  openManageRoutinesModal: () => void;
  closeManageRoutinesModal: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  currentView: 'daily',
  selectedDate: dayjs().format('YYYY-MM-DD'),
  activeNote: null,
  isSaving: false,
  isDirty: false,
  externalNoteConflict: null,
  notesList: [],
  isSettingsOpen: false,
  settingsActiveTab: 'general',
  isLoading: true,
  isOnboardingOpen: false,
  isSidebarCollapsed: false,

  tasks: [],
  activeTask: null,
  isTaskModalOpen: false,
  taskModalInitialStatus: 'todo',
  isTasksLoading: false,
  previousView: 'tasks',
  taskEditorLayoutMode: 'live',
  isTaskPropertiesPanelOpen: true,
  isTaskSaving: false,
  isTaskDirty: false,

  areas: DEFAULT_AREAS,
  projects: [],

  allTags: [],

  isManageRoutinesModalOpen: false,
  routineCompletionsByDate: {},

  initApp: async () => {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.getSettings();
        if (settings.language && i18n.language !== settings.language) {
          i18n.changeLanguage(settings.language);
        }
        const shouldShowOnboarding = !settings.hasCompletedOnboarding;
        set({
          settings,
          areas: settings.areas || DEFAULT_AREAS,
          projects: settings.projects || [],
          isLoading: false,
          isOnboardingOpen: shouldShowOnboarding,
        });
        await Promise.all([
          get().refreshNotesList(),
          get().refreshTasksList(),
          get().refreshTagsList(),
          get().loadRoutineCompletions(get().selectedDate),
          get().loadNoteForDate(get().selectedDate),
        ]);
      } else {
        // Fallback for browser testing if opened outside electron
        set({
          settings: {
            vaultPath: '/mock/vault',
            language: getSystemLanguage(),
            themeColor: 'indigo',
            colorScheme: 'auto',
            weekStartDay: 1,
            defaultTemplateId: 'standard-worklog',
            templates: [],
            kanbanColumns: DEFAULT_KANBAN_COLUMNS,
            autoSave: true,
            autoSaveDelay: 1000,
            dateFormat: 'YYYY-MM-DD',
            editorFontSize: 15,
            hasCompletedOnboarding: false,
            areas: DEFAULT_AREAS,
            projects: [],
          },
          areas: DEFAULT_AREAS,
          projects: [],
          isLoading: false,
          isOnboardingOpen: true,
        });
      }
    } catch (err) {
      console.error('Failed to init app:', err);
      set({ isLoading: false });
    }
  },

  openOnboarding: () => {
    set({ isOnboardingOpen: true });
  },

  closeOnboarding: () => {
    set({ isOnboardingOpen: false });
  },

  completeOnboarding: async (partial) => {
    const nextSettings: Partial<AppSettings> = {
      ...(partial || {}),
      hasCompletedOnboarding: true,
    };
    await get().updateSettings(nextSettings);
    set({ isOnboardingOpen: false });
  },

  toggleSidebarCollapse: (collapsed?: boolean) => {
    set((state) => ({
      isSidebarCollapsed: collapsed !== undefined ? collapsed : !state.isSidebarCollapsed,
    }));
  },

  loadSettings: async () => {
    if (!window.electronAPI) return;
    const settings = await window.electronAPI.getSettings();
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
    set({
      settings,
      areas: settings.areas || DEFAULT_AREAS,
      projects: settings.projects || [],
    });
  },

  updateSettings: async (partial) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.saveSettings(partial);
    if (updated.language && i18n.language !== updated.language) {
      i18n.changeLanguage(updated.language);
    }
    set({
      settings: updated,
      areas: updated.areas || DEFAULT_AREAS,
      projects: updated.projects || [],
    });
    if (partial.vaultPath) {
      invalidateNotesRefresh();
      await get().refreshNotesList();
    }
    if (partial.vaultPath) {
      invalidateTasksRefresh();
      await get().refreshTasksList();
      await get().loadNoteForDate(get().selectedDate);
    }
  },

  setSelectedDate: async (date: string) => {
    // If current note is dirty, save it first before switching
    if (get().isDirty && get().activeNote) {
      await get().saveActiveNote();
    }
    set({ selectedDate: date });
    await Promise.all([get().loadNoteForDate(date), get().loadRoutineCompletions(date)]);
  },

  setCurrentView: (view: AppViewMode) => {
    set({ currentView: view });
  },

  loadNoteForDate: async (date: string) => {
    if (!window.electronAPI) return;
    try {
      const note = await window.electronAPI.readNote(date);
      if (get().selectedDate === date) set({ activeNote: note, isDirty: false });
    } catch (err) {
      console.error('Failed to read note:', err);
    }
  },

  setNoteContent: (content: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    // Count tasks
    const checked = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
    const unchecked = (content.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;

    noteEditRevision += 1;
    set({
      activeNote: {
        ...activeNote,
        content,
        tasksCompleted: checked,
        tasksTotal: checked + unchecked,
      },
      isDirty: true,
    });
  },

  saveActiveNote: async () => {
    const { activeNote, isSaving } = get();
    if (!activeNote || !window.electronAPI || isSaving) return;

    set({ isSaving: true });
    try {
      let noteToSave: DailyNote | null = activeNote;
      while (noteToSave) {
        const savingRevision = noteEditRevision;
        const res = await window.electronAPI.writeNote(noteToSave.date, noteToSave.content);
        if (!res.success) break;

        const current = get().activeNote;
        if (!current || current.date !== noteToSave.date) break;
        const hasNewerEdits = noteEditRevision !== savingRevision;
        set({
          isDirty: hasNewerEdits,
          activeNote: {
            ...current,
            exists: true,
            filepath: res.filepath,
            lastModified: res.lastModified,
          },
        });
        invalidateNotesRefresh();
        if (!hasNewerEdits) break;
        noteToSave = get().activeNote;
      }
      await get().refreshNotesList();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  handleExternalNoteChange: (change) => {
    const { activeNote, isDirty } = get();
    if (!activeNote || activeNote.date !== change.date) return;
    if (activeNote.content === change.content && change.exists) return;
    if (isDirty) {
      set({ externalNoteConflict: change });
      return;
    }
    noteEditRevision += 1;
    set({
      activeNote: {
        ...activeNote,
        content: change.content,
        exists: change.exists,
        lastModified: change.lastModified,
      },
      isDirty: false,
      externalNoteConflict: null,
    });
  },

  acceptExternalNote: () => {
    const { activeNote, externalNoteConflict } = get();
    if (!activeNote || !externalNoteConflict || activeNote.date !== externalNoteConflict.date) return;
    noteEditRevision += 1;
    set({
      activeNote: {
        ...activeNote,
        content: externalNoteConflict.content,
        exists: externalNoteConflict.exists,
        lastModified: externalNoteConflict.lastModified,
      },
      isDirty: false,
      externalNoteConflict: null,
    });
  },

  keepLocalNote: async () => {
    set({ externalNoteConflict: null, isDirty: true });
    await get().saveActiveNote();
  },

  deleteActiveNote: async (targetDate?: string) => {
    const dateToDelete = targetDate || get().selectedDate;
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteNote(dateToDelete);
      invalidateNotesRefresh();
      await get().refreshNotesList();
      if (get().selectedDate === dateToDelete) {
        await get().loadNoteForDate(dateToDelete);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  },

  refreshNotesList: async () => {
    if (!window.electronAPI) return;
    try {
      const generation = notesRefreshGeneration;
      if (!notesRefreshInFlight || notesRefreshInFlight.generation !== generation) {
        notesRefreshInFlight = { generation, promise: window.electronAPI.listNotes() };
      }
      const request = notesRefreshInFlight;
      const notes = await request.promise;
      if (request.generation === notesRefreshGeneration) set({ notesList: notes });
      if (notesRefreshInFlight === request) notesRefreshInFlight = null;
    } catch (err) {
      console.error('Failed to list notes:', err);
    }
  },

  applyTemplate: (templateId: string) => {
    const { settings, selectedDate, activeNote } = get();
    if (!settings || !activeNote) return;
    const template = settings.templates.find((t) => t.id === templateId);
    if (template) {
      const newContent = formatTemplateContent(
        template.content,
        selectedDate,
        settings.dateFormat,
        settings.language || (i18n.language === 'es' ? 'es' : 'en')
      );
      get().setNoteContent(newContent);
    }
  },

  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },

  openSettings: (tab = 'general') => {
    set({ isSettingsOpen: true, settingsActiveTab: tab });
  },

  setSettingsActiveTab: (tab: string) => {
    set({ settingsActiveTab: tab });
  },

  toggleTaskInNote: (taskText: string, checked: boolean) => {
    const { activeNote } = get();
    if (!activeNote) return;
    
    // Replace markdown checklist item
    const escaped = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const oldRegex = new RegExp(`^([\\s]*[-*]\\s*\\[)([ xX])(\\]\\s*${escaped})`, 'm');
    const newContent = activeNote.content.replace(oldRegex, `$1${checked ? 'x' : ' '}$3`);
    
    if (newContent !== activeNote.content) {
      get().setNoteContent(newContent);
      get().saveActiveNote();
    }
  },

  refreshTagsList: async () => {
    if (!window.electronAPI) return;
    try {
      if (window.electronAPI.getAllTags) {
        const tags = await window.electronAPI.getAllTags();
        set({ allTags: tags || [] });
      } else {
        const settings = get().settings;
        set({ allTags: settings?.tags || [] });
      }
    } catch (err) {
      console.error('Failed to refresh tags:', err);
    }
  },

  saveTagDefinition: async (tagDef: TagDefinition) => {
    if (!window.electronAPI) return;
    try {
      if (window.electronAPI.saveTagDefinition) {
        await window.electronAPI.saveTagDefinition(tagDef);
      } else {
        const settings = get().settings;
        const currentTags = [...(settings?.tags || [])];
        const idx = currentTags.findIndex((t) => t.name.toLowerCase() === tagDef.name.toLowerCase());
        if (idx >= 0) {
          currentTags[idx] = { ...currentTags[idx], ...tagDef };
        } else {
          currentTags.push(tagDef);
        }
        await get().updateSettings({ tags: currentTags });
      }
      await get().loadSettings();
      await get().refreshTagsList();
    } catch (err) {
      console.error('Failed to save tag definition:', err);
    }
  },

  renameTag: async (oldName: string, newName: string) => {
    if (!window.electronAPI) return 0;
    try {
      let count = 0;
      if (window.electronAPI.renameTag) {
        const res = await window.electronAPI.renameTag(oldName, newName);
        count = res?.updatedCount || 0;
      }
      await get().loadSettings();
      await get().refreshTagsList();
      await get().refreshTasksList();
      if (get().activeNote) {
        await get().loadNoteForDate(get().selectedDate);
      }
      return count;
    } catch (err) {
      console.error('Failed to rename tag:', err);
      return 0;
    }
  },

  deleteTag: async (tagName: string, removeFromTasks = true) => {
    if (!window.electronAPI) return 0;
    try {
      let count = 0;
      if (window.electronAPI.deleteTag) {
        const res = await window.electronAPI.deleteTag(tagName, removeFromTasks);
        count = res?.updatedCount || 0;
      }
      await get().loadSettings();
      await get().refreshTagsList();
      await get().refreshTasksList();
      if (get().activeNote) {
        await get().loadNoteForDate(get().selectedDate);
      }
      return count;
    } catch (err) {
      console.error('Failed to delete tag:', err);
      return 0;
    }
  },

  saveArea: async (area: AreaDefinition, oldName?: string) => {
    const effectiveOldName = oldName || area.name;
    const isRename = effectiveOldName.trim().toLowerCase() !== area.name.trim().toLowerCase();

    if (window.electronAPI?.renameArea) {
      await window.electronAPI.renameArea(effectiveOldName, area);
      await get().loadSettings();
      await get().refreshTasksList();
      return;
    }

    const currentAreas = get().areas || DEFAULT_AREAS;
    const cleanId = area.id || area.name.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentAreas.findIndex(
      (a) => a.id === cleanId || a.name.toLowerCase() === effectiveOldName.toLowerCase()
    );

    let updatedAreas: AreaDefinition[];
    if (existingIndex >= 0) {
      updatedAreas = [...currentAreas];
      updatedAreas[existingIndex] = { ...area, id: cleanId };
    } else {
      updatedAreas = [...currentAreas, { ...area, id: cleanId }];
    }

    // Cascade rename to child projects
    let updatedProjects = get().projects || [];
    if (isRename) {
      updatedProjects = updatedProjects.map((p) =>
        (p.areaName || '').toLowerCase() === effectiveOldName.toLowerCase()
          ? { ...p, areaName: area.name }
          : p
      );
    }

    await get().updateSettings({ areas: updatedAreas, projects: updatedProjects });
    await get().refreshTasksList();
  },

  deleteArea: async (areaIdOrName: string) => {
    const currentAreas = get().areas || DEFAULT_AREAS;
    const clean = areaIdOrName.toLowerCase();
    const areaToRemove = currentAreas.find(
      (a) => a.id.toLowerCase() === clean || a.name.toLowerCase() === clean
    );
    const updatedAreas = currentAreas.filter(
      (a) => a.id.toLowerCase() !== clean && a.name.toLowerCase() !== clean
    );
    const targetArea = updatedAreas[0]?.name || 'General';
    const updatedProjects = (get().projects || []).map((p) =>
      areaToRemove && (p.areaName || '').toLowerCase() === areaToRemove.name.toLowerCase()
        ? { ...p, areaName: targetArea }
        : p
    );
    await get().updateSettings({ areas: updatedAreas, projects: updatedProjects });
    await get().refreshTasksList();
  },

  saveProject: async (project: ProjectDefinition, oldName?: string, oldAreaName?: string) => {
    const effectiveOldName = oldName || project.name;
    const effectiveOldArea = oldAreaName || project.areaName;

    if (window.electronAPI?.renameProject) {
      await window.electronAPI.renameProject(effectiveOldName, project, effectiveOldArea);
      await get().loadSettings();
      await get().refreshTasksList();
      return;
    }

    const currentProjects = get().projects || [];
    const cleanId = project.id || project.name.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentProjects.findIndex(
      (p) =>
        p.id === cleanId ||
        (p.name.toLowerCase() === effectiveOldName.toLowerCase() &&
          (p.areaName || '').toLowerCase() === effectiveOldArea.toLowerCase())
    );

    let updatedProjects: ProjectDefinition[];
    if (existingIndex >= 0) {
      updatedProjects = [...currentProjects];
      updatedProjects[existingIndex] = { ...project, id: cleanId };
    } else {
      updatedProjects = [...currentProjects, { ...project, id: cleanId }];
    }

    await get().updateSettings({ projects: updatedProjects });
    await get().refreshTasksList();
  },

  deleteProject: async (projectIdOrName: string) => {
    const currentProjects = get().projects || [];
    const clean = projectIdOrName.toLowerCase();
    const updatedProjects = currentProjects.filter(
      (p) => p.id.toLowerCase() !== clean && p.name.toLowerCase() !== clean
    );
    await get().updateSettings({ projects: updatedProjects });
    await get().refreshTasksList();
  },

  refreshTasksList: async () => {
    if (!window.electronAPI) return;
    try {
      set({ isTasksLoading: true });
      const generation = tasksRefreshGeneration;
      if (!tasksRefreshInFlight || tasksRefreshInFlight.generation !== generation) {
        tasksRefreshInFlight = { generation, promise: window.electronAPI.listTasks() };
      }
      const request = tasksRefreshInFlight;
      const tasks = await request.promise;
      if (request.generation === tasksRefreshGeneration) {
        set({ tasks: tasks || [], isTasksLoading: false });
      }
      if (tasksRefreshInFlight === request) tasksRefreshInFlight = null;
    } catch (err) {
      console.error('Failed to list tasks:', err);
      set({ isTasksLoading: false });
    }
  },

  createOrUpdateTask: async (taskData) => {
    if (!window.electronAPI) return null;
    try {
      const res = await window.electronAPI.writeTask(taskData);
      if (res.success) {
        invalidateTasksRefresh();
        await get().refreshTasksList();
        return res.task;
      }
      return null;
    } catch (err) {
      console.error('Failed to write task:', err);
      return null;
    }
  },

  updateTaskStatus: async (filename: string, status: TaskStatus) => {
    // Optimistically update status in local state for instant drag feedback
    const previousTasks = get().tasks;
    set({
      tasks: previousTasks.map((t) => (t.filename === filename ? { ...t, status } : t)),
    });

    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.updateTaskStatus(filename, status);
      if (res.success) {
        invalidateTasksRefresh();
        await get().refreshTasksList();
      } else {
        // Rollback on error
        set({ tasks: previousTasks });
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      set({ tasks: previousTasks });
    }
  },

  deleteTask: async (filename: string) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteTask(filename);
      invalidateTasksRefresh();
      await get().refreshTasksList();
      if (get().activeTask?.filename === filename) {
        set({ activeTask: null, isTaskModalOpen: false });
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  },

  logTaskToDailyNote: async (task: TaskMeta, targetDate?: string) => {
    if (!window.electronAPI) return false;
    const dateToUse = targetDate || get().selectedDate || dayjs().format('YYYY-MM-DD');
    try {
      const res = await window.electronAPI.logTaskToDailyNote({
        date: dateToUse,
        taskTitle: task.title,
        status: task.status,
        priority: task.priority,
        filename: task.filename,
        taskId: task.taskId,
      });

      if (res.success) {
        // If the date logged matches the currently loaded active note or selected date, reload it
        await get().refreshNotesList();
        if (get().selectedDate === dateToUse) {
          await get().loadNoteForDate(dateToUse);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to log task to daily note:', err);
      return false;
    }
  },

  openTaskModal: async (task = null, defaultStatus = 'todo') => {
    const detailedTask = task && 'content' in task
      ? task
      : task?.filename && window.electronAPI
        ? await window.electronAPI.readTask(task.filename)
        : null;
    set({
      activeTask: detailedTask,
      taskModalInitialStatus: defaultStatus,
      isTaskModalOpen: true,
    });
  },

  closeTaskModal: () => {
    set({
      activeTask: null,
      isTaskModalOpen: false,
    });
  },

  openTaskEditor: async (task = null, defaultStatus = 'todo', returnView) => {
    const current = get().currentView;
    const prev = returnView || (current === 'task' ? get().previousView : current);
    const detailedTask = task && 'content' in task
      ? task
      : task?.filename && window.electronAPI
        ? await window.electronAPI.readTask(task.filename)
        : null;
    set({
      activeTask: detailedTask,
      taskModalInitialStatus: defaultStatus,
      isTaskModalOpen: false,
      previousView: prev,
      currentView: 'task',
      isTaskDirty: false,
    });
  },

  closeTaskEditor: () => {
    const prev = get().previousView || 'tasks';
    set({
      currentView: prev,
      activeTask: null,
      isTaskDirty: false,
    });
  },

  setActiveTask: (task: TaskItem | null) => {
    set({ activeTask: task });
  },

  setTaskEditorLayoutMode: (mode: 'live' | 'split' | 'edit' | 'preview') => {
    set({ taskEditorLayoutMode: mode });
  },

  toggleTaskPropertiesPanel: () => {
    set((state) => ({ isTaskPropertiesPanelOpen: !state.isTaskPropertiesPanelOpen }));
  },

  setTaskDirty: (isDirty: boolean) => {
    set({ isTaskDirty: isDirty });
  },

  loadRoutineCompletions: async (date: string) => {
    if (!window.electronAPI) return;
    const routineIds = await window.electronAPI.getRoutineCompletions(date);
    set((state) => ({
      routineCompletionsByDate: {
        ...state.routineCompletionsByDate,
        [date]: routineIds,
      },
    }));
  },

  toggleRoutineCompletion: async (date: string, routineId: string) => {
    if (!window.electronAPI) return;
    const dateCompletions = new Set(get().routineCompletionsByDate[date] || []);
    if (dateCompletions.has(routineId)) {
      dateCompletions.delete(routineId);
    } else {
      dateCompletions.add(routineId);
    }
    const updated = await window.electronAPI.updateRoutineCompletions(date, Array.from(dateCompletions));
    set((state) => ({
      routineCompletionsByDate: { ...state.routineCompletionsByDate, [date]: updated },
    }));
  },

  completeAllDailyRoutines: async (date: string, routineIds: string[]) => {
    if (!window.electronAPI) return;
    const current = get().routineCompletionsByDate[date] || [];
    const updated = await window.electronAPI.updateRoutineCompletions(
      date,
      Array.from(new Set([...current, ...routineIds]))
    );
    set((state) => ({
      routineCompletionsByDate: { ...state.routineCompletionsByDate, [date]: updated },
    }));
  },

  resetDailyRoutines: async (date: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateRoutineCompletions(date, []);
    set((state) => {
      const routineCompletionsByDate = { ...state.routineCompletionsByDate };
      delete routineCompletionsByDate[date];
      return { routineCompletionsByDate };
    });
  },

  saveRoutinesList: async (routines: DailyRoutine[]) => {
    await get().updateSettings({ routines });
  },

  toggleDailyRoutinesPanel: async () => {
    const settings = get().settings;
    if (!settings) return;
    const current = settings.showDailyRoutinesPanel !== false;
    await get().updateSettings({ showDailyRoutinesPanel: !current });
  },

  openExternalUrl: async (url: string) => {
    if (!url) return;
    if (window.electronAPI?.openExternalUrl) {
      await window.electronAPI.openExternalUrl(url);
    } else {
      let target = url.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
      }
      window.open(target, '_blank');
    }
  },

  openManageRoutinesModal: () => {
    set({ isManageRoutinesModalOpen: true });
  },

  closeManageRoutinesModal: () => {
    set({ isManageRoutinesModalOpen: false });
  },
}));

export function useAppStoreSelector<T>(selector: (state: AppState) => T): T {
  return useAppStore(useShallow(selector));
}
