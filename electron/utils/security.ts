import path from 'node:path';
import dayjs from 'dayjs';

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

export function resolvePathInside(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Path is outside the allowed directory');
  }
  return resolvedPath;
}
