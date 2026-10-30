import dayjs from 'dayjs';
import { TaskMeta } from '../types';

export interface ClosedTaskPartition {
  recent: TaskMeta[];
  older: TaskMeta[];
}

/** Closed date of a task: completedDate, then lastModified, then created. */
export function getClosedDate(task: TaskMeta): string | null {
  if (task.completedDate) return task.completedDate;
  if (task.lastModified) {
    const modified = dayjs(task.lastModified);
    if (modified.isValid()) return modified.format('YYYY-MM-DD');
  }
  return task.created || null;
}

/** Sorts closed tasks newest first, breaking day-level ties by lastModified, then taskId. */
export function sortClosedTasks(tasks: TaskMeta[]): TaskMeta[] {
  return [...tasks].sort((a, b) => {
    const dateA = getClosedDate(a) ?? '';
    const dateB = getClosedDate(b) ?? '';
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;

    const modA = a.lastModified ? dayjs(a.lastModified).valueOf() : 0;
    const modB = b.lastModified ? dayjs(b.lastModified).valueOf() : 0;
    if (modA !== modB) return modB - modA;

    return (b.taskId ?? 0) - (a.taskId ?? 0);
  });
}

/**
 * Splits (already sorted) closed tasks into recent and older ones.
 * A task closed exactly windowDays ago counts as older. A null window keeps everything recent.
 */
export function partitionClosedTasks(
  tasks: TaskMeta[],
  windowDays: number | null,
  now: dayjs.ConfigType = dayjs()
): ClosedTaskPartition {
  if (windowDays === null) return { recent: tasks, older: [] };

  const today = dayjs(now).startOf('day');
  const recent: TaskMeta[] = [];
  const older: TaskMeta[] = [];
  tasks.forEach((task) => {
    const closed = getClosedDate(task);
    const isOlder = closed ? today.diff(dayjs(closed).startOf('day'), 'day') >= windowDays : false;
    (isOlder ? older : recent).push(task);
  });
  return { recent, older };
}
