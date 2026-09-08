import dayjs from 'dayjs';
import { TaskItem, TaskMeta, TaskStatus } from '../../types';
import { AppSlice, TasksSlice } from '../types';
import { invalidateNotesRefresh } from './notesSlice';

let tasksRefreshGeneration = 0;
let tasksRefreshInFlight: { generation: number; promise: Promise<TaskMeta[]> } | null = null;

export function invalidateTasksRefresh(): void {
  tasksRefreshGeneration += 1;
  tasksRefreshInFlight = null;
}

export const createTasksSlice: AppSlice<TasksSlice> = (set, get) => ({
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
        invalidateNotesRefresh();
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
    if (get().isDirty && get().activeNote) {
      const saved = await get().saveActiveNote({ force: true });
      if (!saved) return;
    }
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
});
