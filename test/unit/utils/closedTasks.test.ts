import { describe, it, expect } from 'vitest';
import { getClosedDate, partitionClosedTasks, sortClosedTasks } from '../../../src/utils/closedTasks';
import type { TaskMeta } from '../../../src/types';

function makeTask(overrides: Partial<TaskMeta>): TaskMeta {
  return {
    id: 'task',
    filename: 'task.md',
    filepath: '/tasks/task.md',
    title: 'Task',
    status: 'done',
    created: '2026-01-01',
    ...overrides,
  };
}

describe('closedTasks', () => {
  describe('getClosedDate', () => {
    it('prefers completedDate, then lastModified, then created', () => {
      expect(getClosedDate(makeTask({ completedDate: '2026-03-01', lastModified: '2026-04-01T10:00:00' }))).toBe('2026-03-01');
      expect(getClosedDate(makeTask({ lastModified: '2026-04-01T10:00:00' }))).toBe('2026-04-01');
      expect(getClosedDate(makeTask({}))).toBe('2026-01-01');
    });
  });

  describe('sortClosedTasks', () => {
    it('sorts newest closed date first without mutating the input', () => {
      const input = [
        makeTask({ id: 'a', completedDate: '2026-02-01' }),
        makeTask({ id: 'b', completedDate: '2026-05-01' }),
        makeTask({ id: 'c', completedDate: '2026-03-01' }),
      ];
      expect(sortClosedTasks(input).map((t) => t.id)).toEqual(['b', 'c', 'a']);
      expect(input.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    });

    it('breaks ties by lastModified, then taskId descending', () => {
      const sorted = sortClosedTasks([
        makeTask({ id: 'a', completedDate: '2026-05-01', lastModified: '2026-05-01T08:00:00', taskId: 1 }),
        makeTask({ id: 'b', completedDate: '2026-05-01', lastModified: '2026-05-01T09:00:00', taskId: 2 }),
        makeTask({ id: 'c', completedDate: '2026-05-01', lastModified: '2026-05-01T09:00:00', taskId: 3 }),
      ]);
      expect(sorted.map((t) => t.id)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('partitionClosedTasks', () => {
    const now = '2026-06-30T12:00:00';

    it('splits tasks by window, treating exactly windowDays ago as older', () => {
      const tasks = [
        makeTask({ id: 'today', completedDate: '2026-06-30' }),
        makeTask({ id: 'edge-recent', completedDate: '2026-06-01' }),
        makeTask({ id: 'edge-older', completedDate: '2026-05-31' }),
        makeTask({ id: 'old', completedDate: '2026-01-01' }),
      ];
      const { recent, older } = partitionClosedTasks(tasks, 30, now);
      expect(recent.map((t) => t.id)).toEqual(['today', 'edge-recent']);
      expect(older.map((t) => t.id)).toEqual(['edge-older', 'old']);
    });

    it('keeps everything recent when the window is null', () => {
      const tasks = [makeTask({ id: 'old', completedDate: '2020-01-01' })];
      const { recent, older } = partitionClosedTasks(tasks, null, now);
      expect(recent).toHaveLength(1);
      expect(older).toHaveLength(0);
    });
  });
});
