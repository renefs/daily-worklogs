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
