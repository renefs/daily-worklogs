import dayjs from 'dayjs';
import { flushTaskEditor } from '../../services/editorSession';
import { DEFAULT_KANBAN_COLUMNS, TaskItem, TaskMeta, TaskPriority, TaskStatus } from '../../types';
import { AppSlice, TasksSlice } from '../types';
import { invalidateNotesRefresh } from './notesSlice';

let tasksRefreshGeneration = 0;
let tasksRefreshInFlight: { generation: number; promise: Promise<TaskMeta[]> } | null = null;

export function invalidateTasksRefresh(): void {
  tasksRefreshGeneration += 1;
  tasksRefreshInFlight = null;
}

function areTaskListsEqual(a: TaskMeta[], b: TaskMeta[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.taskId !== right.taskId ||
      left.filename !== right.filename ||
      left.filepath !== right.filepath ||
      left.title !== right.title ||
      left.status !== right.status ||
      left.priority !== right.priority ||
      left.area !== right.area ||
      left.project !== right.project ||
      left.created !== right.created ||
      left.due !== right.due ||
      left.startedDate !== right.startedDate ||
      left.completedDate !== right.completedDate ||
      left.parent !== right.parent ||
      left.lastModified !== right.lastModified ||
      left.checklistTotal !== right.checklistTotal ||
      left.checklistCompleted !== right.checklistCompleted ||
      (left.tags?.length ?? 0) !== (right.tags?.length ?? 0) ||
      Boolean(left.tags?.some((tag, idx) => tag !== right.tags?.[idx]))
    ) {
      return false;
    }
  }
  return true;
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
        const nextTasks = tasks || [];
        set((state) => ({
          tasks: areTaskListsEqual(state.tasks, nextTasks) ? state.tasks : nextTasks,
          isTasksLoading: false,
        }));
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
      if (res && res.success) {
        invalidateTasksRefresh();
        await get().refreshTasksList();
        return res.task;
      }
      console.error('Failed to write task, IPC returned:', res);
      return null;
    } catch (err) {
      console.error('Failed to write task:', err);
      return null;
    }
  },

  updateTaskStatus: async (filename: string, status: TaskStatus) => {
    // Optimistically update status in local state for instant drag feedback
    const previousTasks = get().tasks;
    const columns = get().settings?.kanbanColumns?.length
      ? get().settings!.kanbanColumns!
      : DEFAULT_KANBAN_COLUMNS;
    const behavior = columns.find((c) => c.id === status)?.behavior;
    const isClosed = behavior === 'done' || behavior === 'cancelled';
    const todayStr = dayjs().format('YYYY-MM-DD');
    set({
      tasks: previousTasks.map((t) => {
        if (t.filename !== filename) return t;
        // Mirror the update-task-status IPC handler so closed tasks sort and window correctly right away
        if (isClosed) return { ...t, status, completedDate: t.completedDate || todayStr };
        const prevBehavior = columns.find((c) => c.id === t.status)?.behavior;
        const wasClosed = prevBehavior === 'done' || prevBehavior === 'cancelled';
        if (wasClosed) return { ...t, status, completedDate: undefined };
        return { ...t, status };
      }),
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

  moveTasksToStatus: async (moves) => {
    // Sequential on purpose: each update rewrites a task file and refreshes the list.
    for (const move of moves) {
      await get().updateTaskStatus(move.filename, move.status);
    }
    const byFilename = new Map(get().tasks.map((task) => [task.filename, task.status]));
    return moves.every((move) => byFilename.get(move.filename) === move.status);
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

  logTaskToDailyNote: async (task: TaskMeta | { title: string; status: TaskStatus; priority?: TaskPriority; filename?: string; taskId?: number }, targetDate?: string) => {
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
    let detailedTask: TaskItem | null = null;
    if (task) {
      if ('content' in task && typeof task.content === 'string') {
        detailedTask = task as TaskItem;
      } else if (task.filename && window.electronAPI) {
        detailedTask = await window.electronAPI.readTask(task.filename);
      } else {
        const partial = task as Partial<TaskItem>;
        detailedTask = {
          id: partial.id || '',
          taskId: partial.taskId,
          filename: partial.filename || '',
          filepath: partial.filepath || '',
          title: partial.title || '',
          status: partial.status || defaultStatus,
          priority: partial.priority || 'medium',
          area: partial.area || 'General',
          project: partial.project || undefined,
          created: partial.created || dayjs().format('YYYY-MM-DD'),
          due: partial.due,
          startedDate: partial.startedDate,
          completedDate: partial.completedDate,
          tags: partial.tags || [],
          parent: partial.parent,
          content: partial.content || '',
        };
      }
    }
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
    if (get().currentView === 'task') {
      const saved = await flushTaskEditor();
      if (!saved) return;
    }
    if (get().isDirty && get().activeNote) {
      const saved = await get().saveActiveNote({ force: true });
      if (!saved) return;
    }
    const current = get().currentView;
    // Settings is not a place the editor can return to; use the view Settings was opened from instead.
    const fromView = current === 'settings' ? get().settingsReturnView : current;
    const prev = returnView || (current === 'task' || fromView === 'task' ? get().previousView : fromView);
    let detailedTask: TaskItem | null = null;
    if (task) {
      if ('content' in task && typeof task.content === 'string') {
        detailedTask = task as TaskItem;
      } else if (task.filename && window.electronAPI) {
        detailedTask = await window.electronAPI.readTask(task.filename);
      } else {
        const partial = task as Partial<TaskItem>;
        detailedTask = {
          id: partial.id || '',
          taskId: partial.taskId,
          filename: partial.filename || '',
          filepath: partial.filepath || '',
          title: partial.title || '',
          status: partial.status || defaultStatus,
          priority: partial.priority || 'medium',
          area: partial.area || 'General',
          project: partial.project || undefined,
          created: partial.created || dayjs().format('YYYY-MM-DD'),
          due: partial.due,
          startedDate: partial.startedDate,
          completedDate: partial.completedDate,
          tags: partial.tags || [],
          parent: partial.parent,
          content: partial.content || '',
        };
      }
    }
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
