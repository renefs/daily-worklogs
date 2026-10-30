import { describe, it, expect, beforeEach, vi } from 'vitest';
import dayjs from 'dayjs';
import { useAppStore } from '../../../src/store/useAppStore';
import { TaskMeta } from '../../../src/types';

const baseTask: TaskMeta = {
  id: 'task-1',
  filename: 'task-1.md',
  filepath: '/vault/tasks/task-1.md',
  title: 'Task',
  status: 'todo',
  created: '2026-01-01',
  lastModified: '2026-01-01T10:00:00.000Z',
};

// Reads the optimistic state while the IPC call is still pending
const statusUpdateSnapshot = (task: TaskMeta, status: string) => {
  useAppStore.setState({ tasks: [task] });
  vi.mocked(window.electronAPI.updateTaskStatus).mockReturnValueOnce(new Promise(() => {}));
  void useAppStore.getState().updateTaskStatus(task.filename, status);
  return useAppStore.getState().tasks[0];
};

describe('updateTaskStatus optimistic update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.updateTaskStatus = vi.fn();
    useAppStore.setState({ settings: null });
  });

  it('stamps today as completedDate when moving a task into a closed column', () => {
    const task = statusUpdateSnapshot(baseTask, 'done');
    expect(task.status).toBe('done');
    expect(task.completedDate).toBe(dayjs().format('YYYY-MM-DD'));
  });

  it('keeps an existing completedDate when moving into a closed column', () => {
    const task = statusUpdateSnapshot({ ...baseTask, completedDate: '2026-02-02' }, 'done');
    expect(task.completedDate).toBe('2026-02-02');
  });

  it('clears completedDate when reopening a closed task', () => {
    const task = statusUpdateSnapshot({ ...baseTask, status: 'done', completedDate: '2026-02-02' }, 'todo');
    expect(task.status).toBe('todo');
    expect(task.completedDate).toBeUndefined();
  });

  it('leaves completedDate alone when moving between open columns', () => {
    const task = statusUpdateSnapshot(baseTask, 'in_progress');
    expect(task.status).toBe('in_progress');
    expect(task.completedDate).toBeUndefined();
  });
});

describe('moveTasksToStatus', () => {
  const task = (id: string, status: string): TaskMeta => ({ ...baseTask, id, filename: `${id}.md`, status });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ settings: null });
  });

  it('updates every task through the task status path and reports success', async () => {
    let disk = [task('a', 'review'), task('b', 'review')];
    window.electronAPI.listTasks = vi.fn(async () => disk);
    window.electronAPI.updateTaskStatus = vi.fn(async (filename: string, status: string) => {
      disk = disk.map((item) => (item.filename === filename ? { ...item, status } : item));
      return { success: true } as never;
    });
    useAppStore.setState({ tasks: disk });

    const ok = await useAppStore.getState().moveTasksToStatus([
      { filename: 'a.md', status: 'todo' },
      { filename: 'b.md', status: 'todo' },
    ]);

    expect(ok).toBe(true);
    expect(window.electronAPI.updateTaskStatus).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().tasks.map((item) => item.status)).toEqual(['todo', 'todo']);
  });

  it('reports failure when a task keeps its old status', async () => {
    const disk = [task('a', 'review')];
    window.electronAPI.listTasks = vi.fn(async () => disk);
    window.electronAPI.updateTaskStatus = vi.fn(async () => ({ success: false } as never));
    useAppStore.setState({ tasks: disk });

    expect(await useAppStore.getState().moveTasksToStatus([{ filename: 'a.md', status: 'todo' }])).toBe(false);
  });
});
