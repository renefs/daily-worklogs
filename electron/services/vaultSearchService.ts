import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { listDailyNoteFiles } from './vaultService';
import { readTaskFiles, parseNumericTaskId } from './taskFileService';

export interface VaultSearchResult {
  type: 'note' | 'task';
  id: string; // date 'YYYY-MM-DD' or task filename
  title: string;
  snippet: string;
  line?: number;
  tags?: string[];
  status?: string;
  taskId?: number;
}

interface CachedNote {
  filepath: string;
  date: string;
  mtimeMs: number;
  content: string;
}

interface CachedTask {
  filepath: string;
  filename: string;
  mtimeMs: number;
  raw: string;
  title: string;
  status: string;
  tags: string[];
  taskId?: number;
  content: string;
}

const noteCache = new Map<string, CachedNote>();
const taskCache = new Map<string, CachedTask>();

export function invalidateVaultSearchCache(): void {
  noteCache.clear();
  taskCache.clear();
}

function extractSnippet(content: string, queryWords: string[]): { snippet: string; line: number } {
  const lines = content.split('\n');
  const lowerQueryWords = queryWords.map((w) => w.toLowerCase());

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    const matchesAll = lowerQueryWords.some((word) => lineLower.includes(word));
    if (matchesAll) {
      const trimmed = lines[i].trim();
      return {
        snippet: trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed,
        line: i + 1,
      };
    }
  }

  // Fallback to first non-empty line
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('#')) {
      return {
        snippet: trimmed.length > 100 ? `${trimmed.slice(0, 100)}...` : trimmed,
        line: i + 1,
      };
    }
  }

  return { snippet: '', line: 1 };
}

export async function searchVault(
  vaultPath: string,
  rawQuery: string,
  maxResults = 25
): Promise<VaultSearchResult[]> {
  const cleanQuery = rawQuery
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();

  const query = cleanQuery.toLowerCase();
  if (!query) return [];

  const queryWords = query.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return [];

  const results: VaultSearchResult[] = [];

  // 1. Refresh daily note cache as needed
  try {
    const noteFiles = await listDailyNoteFiles(vaultPath);
    for (const noteFile of noteFiles) {
      try {
        const stat = await fsp.stat(noteFile.filepath);
        const cached = noteCache.get(noteFile.filepath);
        let content = cached?.content;

        if (!cached || cached.mtimeMs !== stat.mtimeMs) {
          content = await fsp.readFile(noteFile.filepath, 'utf-8');
          noteCache.set(noteFile.filepath, {
            filepath: noteFile.filepath,
            date: noteFile.date,
            mtimeMs: stat.mtimeMs,
            content,
          });
        }

        if (content) {
          const contentLower = content.toLowerCase();
          const dateMatches = noteFile.date.includes(query);
          const contentMatches = queryWords.every((word) => contentLower.includes(word));

          if (dateMatches || contentMatches) {
            const { snippet, line } = extractSnippet(content, queryWords);
            results.push({
              type: 'note',
              id: noteFile.date,
              title: noteFile.date,
              snippet: snippet || `Daily note for ${noteFile.date}`,
              line,
            });
          }
        }
      } catch (err) {
        console.warn(`Error reading note file ${noteFile.filepath} during search:`, err);
      }
    }
  } catch (err) {
    console.warn('Error reading notes list during search:', err);
  }

  // 2. Refresh task cache as needed
  try {
    const tasksDir = path.join(vaultPath, 'tasks');
    if (fs.existsSync(tasksDir)) {
      const taskReads = await readTaskFiles(tasksDir);
      for (const read of taskReads) {
        const cached = taskCache.get(read.filepath);
        let taskData = cached;

        if (!cached || cached.mtimeMs !== read.stat.mtimeMs) {
          const parsed = matter(read.raw);
          const data = parsed.data || {};
          let title = data.title;
          if (!title) {
            const headingMatch = parsed.content.match(/^#\s+(.+)$/m);
            title = headingMatch ? headingMatch[1].trim() : read.filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
          }
          const tags = Array.isArray(data.tags) ? data.tags : [];
          const status = data.status ? String(data.status).trim() : 'todo';
          const taskId = parseNumericTaskId(data);

          taskData = {
            filepath: read.filepath,
            filename: read.filename,
            mtimeMs: read.stat.mtimeMs,
            raw: read.raw,
            title,
            status,
            tags,
            taskId,
            content: parsed.content,
          };
          taskCache.set(read.filepath, taskData);
        }

        if (taskData) {
          const fullTextLower = taskData.raw.toLowerCase();
          const taskMatches = queryWords.every((word) => fullTextLower.includes(word));
          const idMatches = taskData.taskId && `#${taskData.taskId}`.includes(query);

          if (taskMatches || idMatches) {
            const { snippet, line } = extractSnippet(taskData.content, queryWords);
            results.push({
              type: 'task',
              id: taskData.filename,
              title: taskData.taskId ? `#${taskData.taskId} ${taskData.title}` : taskData.title,
              snippet: snippet || taskData.title,
              line,
              tags: taskData.tags,
              status: taskData.status,
              taskId: taskData.taskId,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading tasks during search:', err);
  }

  return results.slice(0, maxResults);
}
