import { create } from 'zustand';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { AppSettings, AppViewMode, DailyNote, DailyNoteMeta, DailyRoutine, DEFAULT_KANBAN_COLUMNS, TaskItem, TaskPriority, TaskStatus } from '../types';
import i18n, { getSystemLanguage } from '../i18n';
import { formatTemplateContent } from '../utils/dateTemplate';

dayjs.extend(isoWeek);

interface AppState {
  settings: AppSettings | null;
  currentView: AppViewMode;
  selectedDate: string; // YYYY-MM-DD
  activeNote: DailyNote | null;
  isSaving: boolean;
  isDirty: boolean;
  notesList: DailyNoteMeta[];
  isSettingsOpen: boolean;
  settingsActiveTab: string;
  isLoading: boolean;
  isOnboardingOpen: boolean;

  // Tasks state
  tasks: TaskItem[];
  activeTask: TaskItem | null;
  isTaskModalOpen: boolean;
  taskModalInitialStatus: TaskStatus;
  isTasksLoading: boolean;

  // Routines state
  isManageRoutinesModalOpen: boolean;

  // Actions
  initApp: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setCurrentView: (view: AppViewMode) => void;
  loadNoteForDate: (date: string) => Promise<void>;
  setNoteContent: (content: string) => void;
  saveActiveNote: () => Promise<void>;
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

  // Task actions
  refreshTasksList: () => Promise<void>;
  createOrUpdateTask: (taskData: {
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
  }) => Promise<TaskItem | null>;
  updateTaskStatus: (filename: string, status: TaskStatus) => Promise<void>;
  deleteTask: (filename: string) => Promise<void>;
  logTaskToDailyNote: (task: TaskItem, targetDate?: string) => Promise<boolean>;
  openTaskModal: (task?: TaskItem | null, defaultStatus?: TaskStatus) => void;
  closeTaskModal: () => void;

  // Routine actions
  toggleRoutineCompletion: (date: string, routineId: string) => Promise<void>;
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
  notesList: [],
  isSettingsOpen: false,
  settingsActiveTab: 'general',
  isLoading: true,
  isOnboardingOpen: false,

  tasks: [],
  activeTask: null,
  isTaskModalOpen: false,
  taskModalInitialStatus: 'todo',
  isTasksLoading: false,

  isManageRoutinesModalOpen: false,

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
          isLoading: false,
          isOnboardingOpen: shouldShowOnboarding,
        });
        await get().refreshNotesList();
        await get().refreshTasksList();
        await get().loadNoteForDate(get().selectedDate);
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
          },
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

  loadSettings: async () => {
    if (!window.electronAPI) return;
    const settings = await window.electronAPI.getSettings();
    set({ settings });
  },

  updateSettings: async (partial) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.saveSettings(partial);
    if (partial.language && i18n.language !== partial.language) {
      i18n.changeLanguage(partial.language);
    }
    set({ settings: updated });
    await get().refreshNotesList();
  },

  setSelectedDate: async (date: string) => {
    // If current note is dirty, save it first before switching
    if (get().isDirty && get().activeNote) {
      await get().saveActiveNote();
    }
    set({ selectedDate: date });
    await get().loadNoteForDate(date);
  },

  setCurrentView: (view: AppViewMode) => {
    set({ currentView: view });
  },

  loadNoteForDate: async (date: string) => {
    if (!window.electronAPI) return;
    try {
      const note = await window.electronAPI.readNote(date);
      set({ activeNote: note, isDirty: false });
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
      const res = await window.electronAPI.writeNote(activeNote.date, activeNote.content);
      if (res.success) {
        set({
          isDirty: false,
          activeNote: {
            ...activeNote,
            exists: true,
            filepath: res.filepath,
            lastModified: res.lastModified,
          },
        });
        await get().refreshNotesList();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteActiveNote: async (targetDate?: string) => {
    const dateToDelete = targetDate || get().selectedDate;
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteNote(dateToDelete);
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
      const notes = await window.electronAPI.listNotes();
      set({ notesList: notes });
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

  refreshTasksList: async () => {
    if (!window.electronAPI) return;
    try {
      set({ isTasksLoading: true });
      const tasks = await window.electronAPI.listTasks();
      set({ tasks: tasks || [], isTasksLoading: false });
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
      await get().refreshTasksList();
      if (get().activeTask?.filename === filename) {
        set({ activeTask: null, isTaskModalOpen: false });
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  },

  logTaskToDailyNote: async (task: TaskItem, targetDate?: string) => {
    if (!window.electronAPI) return false;
    const dateToUse = targetDate || get().selectedDate || dayjs().format('YYYY-MM-DD');
    try {
      const res = await window.electronAPI.logTaskToDailyNote({
        date: dateToUse,
        taskTitle: task.title,
        status: task.status,
        priority: task.priority,
        filename: task.filename,
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

  openTaskModal: (task = null, defaultStatus = 'todo') => {
    set({
      activeTask: task,
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

  toggleRoutineCompletion: async (date: string, routineId: string) => {
    const settings = get().settings;
    if (!settings) return;
    const currentCompletions = { ...(settings.routineCompletions || {}) };
    const dateCompletions = new Set(currentCompletions[date] || []);
    if (dateCompletions.has(routineId)) {
      dateCompletions.delete(routineId);
    } else {
      dateCompletions.add(routineId);
    }
    currentCompletions[date] = Array.from(dateCompletions);
    await get().updateSettings({ routineCompletions: currentCompletions });
  },

  completeAllDailyRoutines: async (date: string, routineIds: string[]) => {
    const settings = get().settings;
    if (!settings) return;
    const currentCompletions = { ...(settings.routineCompletions || {}) };
    currentCompletions[date] = Array.from(new Set([...(currentCompletions[date] || []), ...routineIds]));
    await get().updateSettings({ routineCompletions: currentCompletions });
  },

  resetDailyRoutines: async (date: string) => {
    const settings = get().settings;
    if (!settings) return;
    const currentCompletions = { ...(settings.routineCompletions || {}) };
    delete currentCompletions[date];
    await get().updateSettings({ routineCompletions: currentCompletions });
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

