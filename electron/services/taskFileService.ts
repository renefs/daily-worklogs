import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { mapWithConcurrency } from '../utils/async';

export interface TaskFileRead {
  filename: string;
  filepath: string;
  raw: string;
  stat: fs.Stats;
}

export function parseNumericTaskId(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;

  for (const candidate of [data.id, data.taskId]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return Math.floor(candidate);
  }
  for (const candidate of [data.id, data.taskId]) {
    if (typeof candidate !== 'string') continue;
    const clean = candidate.replace(/^#/, '').trim();
    const parsed = Number.parseInt(clean, 10);
    if (Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === clean) return parsed;
  }

  return undefined;
}

export function parseTaskCounts(content: string): { tasksCompleted: number; tasksTotal: number } {
  const checked = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
  const unchecked = (content.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;
  return { tasksCompleted: checked, tasksTotal: checked + unchecked };
}

export async function listTaskFilenames(tasksDir: string): Promise<string[]> {
  try {
    const files = await fsp.readdir(tasksDir);
    return files.filter((filename) => filename.toLowerCase().endsWith('.md'));
  } catch {
    return [];
  }
}

export async function readTaskFiles(tasksDir: string, concurrency = 16): Promise<TaskFileRead[]> {
  const filenames = await listTaskFilenames(tasksDir);
  const reads = await mapWithConcurrency(filenames, concurrency, async (filename): Promise<TaskFileRead | null> => {
    const filepath = path.join(tasksDir, filename);
    try {
      const [raw, stat] = await Promise.all([fsp.readFile(filepath, 'utf-8'), fsp.stat(filepath)]);
      return { filename, filepath, raw, stat };
    } catch (error) {
      console.warn(`Could not read task file ${filename}:`, error);
      return null;
    }
  });

  return reads.filter((read): read is TaskFileRead => read !== null);
}
