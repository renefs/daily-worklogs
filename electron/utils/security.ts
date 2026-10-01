import path from 'node:path';
import dayjs from 'dayjs';
import type { TaskPriority, TaskWriteInput } from '../../src/types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function requireIsoDate(value: unknown, fieldName = 'date'): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || dayjs(value).format('YYYY-MM-DD') !== value) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return value;
}

export function requireTaskFilename(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid task filename');
  const filename = value.toLowerCase().endsWith('.md') ? value : `${value}.md`;
  if (path.basename(filename) !== filename || filename.includes('\0')) throw new Error('Invalid task filename');
  return filename;
}

export function requireTaskWriteInput(value: unknown): TaskWriteInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid task data');
  }

  const data = value as Record<string, unknown>;
  const optionalStringFields = [
    'id',
    'area',
    'project',
    'created',
    'due',
    'startedDate',
    'completedDate',
  ] as const;
  const priorityValues: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('Invalid task title');
  if (typeof data.status !== 'string' || !data.status.trim()) throw new Error('Invalid task status');
  if (typeof data.content !== 'string') throw new Error('Invalid task content');
  if (data.taskId !== undefined && (!Number.isSafeInteger(data.taskId) || Number(data.taskId) < 1)) {
    throw new Error('Invalid task ID');
  }
  if (data.filename !== undefined) requireTaskFilename(data.filename);
  if (data.priority !== undefined && !priorityValues.includes(data.priority as TaskPriority)) {
    throw new Error('Invalid task priority');
  }
  if (data.tags !== undefined && (!Array.isArray(data.tags) || !data.tags.every((tag) => typeof tag === 'string'))) {
    throw new Error('Invalid task tags');
  }

  for (const field of optionalStringFields) {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      throw new Error(`Invalid task ${field}`);
    }
  }

  for (const field of ['created', 'due', 'startedDate', 'completedDate'] as const) {
    const date = data[field];
    if (typeof date === 'string' && date !== '') requireIsoDate(date, `task ${field}`);
  }

  return {
    ...(typeof data.id === 'string' ? { id: data.id } : {}),
    ...(typeof data.taskId === 'number' ? { taskId: data.taskId } : {}),
    ...(typeof data.filename === 'string' ? { filename: data.filename } : {}),
    title: data.title,
    status: data.status,
    ...(typeof data.priority === 'string' ? { priority: data.priority as TaskPriority } : {}),
    ...(typeof data.area === 'string' ? { area: data.area } : {}),
    ...(typeof data.project === 'string' ? { project: data.project } : {}),
    ...(typeof data.created === 'string' ? { created: data.created } : {}),
    ...(typeof data.due === 'string' ? { due: data.due } : {}),
    ...(typeof data.startedDate === 'string' ? { startedDate: data.startedDate } : {}),
    ...(typeof data.completedDate === 'string' ? { completedDate: data.completedDate } : {}),
    ...(Array.isArray(data.tags) ? { tags: data.tags as string[] } : {}),
    content: data.content,
  };
}

export function resolvePathInside(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Path is outside the allowed directory');
  }
  return resolvedPath;
}
