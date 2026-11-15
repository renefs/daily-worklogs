import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { listDailyNoteFiles } from './vaultService';
import { readTaskFiles, parseNumericTaskId } from './taskFileService';
import { normalizeSearchQuery } from '../../src/shared/searchQuery';

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

export interface VaultSearchOptions {
  /** Maximum number of results per result type. */
  limitPerType?: number;
  /** Result types to search. Defaults to both notes and tasks. */
  types?: ReadonlyArray<VaultSearchResult['type']>;
}

interface CachedNote {
  lastModified: string;
  content: string;
  contentLower: string;
}

interface CachedTask {
  mtimeMs: number;
  title: string;
  status: string;
  tags: string[];
  taskId?: number;
  content: string;
  /** Lowercased title, tags, area, project and body. Frontmatter keys are left out on purpose. */
  searchText: string;
}

const SNIPPET_LENGTH = 140;
const DEFAULT_LIMIT_PER_TYPE = 20;

const noteCache = new Map<string, CachedNote>();
const taskCache = new Map<string, CachedTask>();

export function invalidateVaultSearchCache(): void {
  noteCache.clear();
  taskCache.clear();
}

function clipAroundMatch(line: string, matchIndex: number): string {
  const trimmed = line.trim();
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed;

  const offset = line.length - line.trimStart().length;
  const index = Math.max(0, matchIndex - offset);
  const start = Math.max(0, Math.min(index - Math.floor(SNIPPET_LENGTH / 3), trimmed.length - SNIPPET_LENGTH));
  const end = start + SNIPPET_LENGTH;
  return `${start > 0 ? '…' : ''}${trimmed.slice(start, end).trim()}${end < trimmed.length ? '…' : ''}`;
}

/**
 * Returns the line that best matches the query: the first line containing every word,
 * otherwise the first line containing any word, otherwise the first content line.
 * The snippet is clipped around the match so the highlighted term stays visible.
 */
export function extractSnippet(content: string, queryWords: string[]): { snippet: string; line: number } {
  const lines = content.split('\n');
  let firstPartial: { snippet: string; line: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    const positions = queryWords.map((word) => lineLower.indexOf(word));
    const found = positions.filter((position) => position >= 0);
    if (found.length === 0) continue;

    const match = { snippet: clipAroundMatch(lines[i], Math.min(...found)), line: i + 1 };
    if (found.length === queryWords.length) return match;
    firstPartial ??= match;
  }
  if (firstPartial) return firstPartial;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed !== '---') {
      return { snippet: clipAroundMatch(lines[i], 0), line: i + 1 };
    }
  }

  return { snippet: '', line: 1 };
}

async function searchNotes(vaultPath: string, query: string, queryWords: string[], limit: number): Promise<VaultSearchResult[]> {
  const results: VaultSearchResult[] = [];
  const noteFiles = await listDailyNoteFiles(vaultPath);
  const seen = new Set<string>();

  // listDailyNoteFiles sorts newest first, so results are ordered by recency.
  for (const noteFile of noteFiles) {
    seen.add(noteFile.filepath);
    try {
      let cached = noteCache.get(noteFile.filepath);
      if (!cached || cached.lastModified !== noteFile.lastModified) {
        const content = await fsp.readFile(noteFile.filepath, 'utf-8');
        cached = { lastModified: noteFile.lastModified, content, contentLower: content.toLowerCase() };
        noteCache.set(noteFile.filepath, cached);
      }

      if (results.length >= limit) continue;
      const dateMatches = noteFile.date.includes(query);
      const contentMatches = queryWords.every((word) => cached.contentLower.includes(word));
      if (!dateMatches && !contentMatches) continue;

      const { snippet, line } = extractSnippet(cached.content, queryWords);
      results.push({ type: 'note', id: noteFile.date, title: noteFile.date, snippet, line });
    } catch (err) {
      console.warn(`Error reading note file ${noteFile.filepath} during search:`, err);
    }
  }

  for (const filepath of noteCache.keys()) {
    if (!seen.has(filepath)) noteCache.delete(filepath);
  }
  return results;
}

function toCachedTask(raw: string, filename: string, mtimeMs: number): CachedTask {
  const parsed = matter(raw);
  const data = (parsed.data || {}) as Record<string, unknown>;
  let title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '';
  if (!title) {
    const headingMatch = parsed.content.match(/^#\s+(.+)$/m);
    title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
  }
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const status = data.status ? String(data.status).trim() : 'todo';
  const extra = [data.area, data.project].filter((value) => typeof value === 'string');

  return {
    mtimeMs,
    title,
    status,
    tags,
    taskId: parseNumericTaskId(data),
    content: parsed.content,
    searchText: [title, ...tags.map((tag) => `#${tag}`), ...extra, parsed.content].join('\n').toLowerCase(),
  };
}

async function searchTasks(vaultPath: string, query: string, queryWords: string[], limit: number): Promise<VaultSearchResult[]> {
  const tasksDir = path.join(vaultPath, 'tasks');
  if (!fs.existsSync(tasksDir)) return [];

  const idQuery = /^#?(\d+)$/.exec(query)?.[1];
  const ranked: Array<{ rank: number; result: VaultSearchResult }> = [];
  const seen = new Set<string>();

  for (const read of await readTaskFiles(tasksDir)) {
    seen.add(read.filepath);
    let task = taskCache.get(read.filepath);
    if (!task || task.mtimeMs !== read.stat.mtimeMs) {
      try {
        task = toCachedTask(read.raw, read.filename, read.stat.mtimeMs);
        taskCache.set(read.filepath, task);
      } catch (err) {
        console.warn(`Error parsing task file ${read.filepath} during search:`, err);
        continue;
      }
    }

    const idExact = idQuery !== undefined && task.taskId !== undefined && String(task.taskId) === idQuery;
    const idPrefix = query.startsWith('#') && idQuery !== undefined && task.taskId !== undefined && String(task.taskId).startsWith(idQuery);
    const textMatches = queryWords.every((word) => task.searchText.includes(word));
    if (!idExact && !idPrefix && !textMatches) continue;

    const titleLower = task.title.toLowerCase();
    const rank = idExact ? 0 : idPrefix ? 1 : queryWords.every((word) => titleLower.includes(word)) ? 2 : 3;
    const { snippet, line } = extractSnippet(task.content, queryWords);
    ranked.push({
      rank,
      result: {
        type: 'task',
        id: read.filename,
        title: task.title,
        snippet,
        line,
        tags: task.tags,
        status: task.status,
        taskId: task.taskId,
      },
    });
  }

  for (const filepath of taskCache.keys()) {
    if (!seen.has(filepath)) taskCache.delete(filepath);
  }

  return ranked
    .sort((a, b) => a.rank - b.rank || (b.result.taskId ?? 0) - (a.result.taskId ?? 0))
    .slice(0, limit)
    .map((entry) => entry.result);
}

export async function searchVault(
  vaultPath: string,
  rawQuery: string,
  options: VaultSearchOptions = {}
): Promise<VaultSearchResult[]> {
  const query = normalizeSearchQuery(rawQuery).toLowerCase();
  const queryWords = query.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return [];

  const limit = options.limitPerType ?? DEFAULT_LIMIT_PER_TYPE;
  const types = options.types ?? ['note', 'task'];

  const [notes, tasks] = await Promise.all([
    types.includes('note')
      ? searchNotes(vaultPath, query, queryWords, limit).catch((err) => {
          console.warn('Error searching notes:', err);
          return [];
        })
      : [],
    types.includes('task')
      ? searchTasks(vaultPath, query, queryWords, limit).catch((err) => {
          console.warn('Error searching tasks:', err);
          return [];
        })
      : [],
  ]);

  return [...notes, ...tasks];
}
