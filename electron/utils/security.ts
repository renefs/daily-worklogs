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
  const priorityValues: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('Invalid task title');
  if (typeof data.status !== 'string' || !data.status.trim()) throw new Error('Invalid task status');
  if (typeof data.content !== 'string') throw new Error('Invalid task content');
  const content = data.content;
  if (data.tags !== undefined && (!Array.isArray(data.tags) || !data.tags.every((tag) => typeof tag === 'string'))) {
    throw new Error('Invalid task tags');
  }

  let taskId: number | undefined;
  if (data.taskId !== undefined && data.taskId !== null) {
    const num = Number(data.taskId);
    if (!Number.isSafeInteger(num) || num < 1) {
      throw new Error('Invalid task ID');
    }
    taskId = num;
  }

  let filename: string | undefined;
  if (data.filename !== undefined && data.filename !== null) {
    if (typeof data.filename === 'string' && data.filename.trim()) {
      filename = requireTaskFilename(data.filename.trim());
    } else if (typeof data.filename !== 'string') {
      throw new Error('Invalid task filename');
    }
  }

  let priority: TaskPriority | undefined;
  if (data.priority !== undefined) {
    if (typeof data.priority !== 'string' || !priorityValues.includes(data.priority as TaskPriority)) {
      throw new Error('Invalid task priority');
    }
    priority = data.priority as TaskPriority;
  }

  const tags = Array.isArray(data.tags)
    ? (data.tags as string[])
    : [];

  const parseIsoOrOmit = (val: unknown, fieldName: string): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      if (ISO_DATE_PATTERN.test(trimmed)) {
        return requireIsoDate(trimmed, `task ${fieldName}`);
      }
      const parsed = dayjs(trimmed);
      if (parsed.isValid()) {
        const formatted = parsed.format('YYYY-MM-DD');
        return requireIsoDate(formatted, `task ${fieldName}`);
      }
      throw new Error(`Invalid task ${fieldName}`);
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      const formatted = dayjs(val).format('YYYY-MM-DD');
      return requireIsoDate(formatted, `task ${fieldName}`);
    }
    return undefined;
  };

  const created = parseIsoOrOmit(data.created, 'created');
  const due = parseIsoOrOmit(data.due, 'due');
  const startedDate = parseIsoOrOmit(data.startedDate, 'startedDate');
  const completedDate = parseIsoOrOmit(data.completedDate, 'completedDate');

  let id: string | undefined;
  if (data.id !== undefined && data.id !== null && String(data.id).trim()) {
    id = String(data.id).trim();
  }

  let area: string | undefined;
  if (typeof data.area === 'string' && data.area.trim()) {
    area = data.area.trim();
  }

  let project: string | undefined;
  if (typeof data.project === 'string' && data.project.trim()) {
    project = data.project.trim();
  }

  let parent: number | undefined;
  if (typeof data.parent === 'number' && Number.isSafeInteger(data.parent) && data.parent > 0) {
    parent = data.parent;
  }

  return {
    ...(id ? { id } : {}),
    ...(taskId ? { taskId } : {}),
    ...(filename ? { filename } : {}),
    title: data.title.trim(),
    status: data.status.trim(),
    ...(priority ? { priority } : {}),
    ...(area ? { area } : {}),
    ...(project ? { project } : {}),
    ...(parent ? { parent } : {}),
    ...(created ? { created } : {}),
    ...(due ? { due } : {}),
    ...(startedDate ? { startedDate } : {}),
    ...(completedDate ? { completedDate } : {}),
    tags,
    content,
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
