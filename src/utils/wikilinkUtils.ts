export interface ParsedWikilink {
  raw: string;
  target: string;
  alias?: string;
  isDate: boolean;
  date?: string;
  isTask: boolean;
  taskId?: number;
  taskFilename?: string;
}

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TASK_ID_REGEX = /^#?(\d+)(?:\s*-\s*(.+))?$/;

export function parseWikilink(rawToken: string): ParsedWikilink | null {
  const token = rawToken.trim();
  if (!token) return null;

  let target: string;
  let alias: string | undefined;

  const match = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(token);
  if (match) {
    target = match[1].trim();
    alias = match[2]?.trim();
  } else {
    // If it's not wrapped in [[ ]], check if it has a pipe alias or is a clean target
    if (token.startsWith('[[') || token.endsWith(']]')) return null;
    const pipeIdx = token.indexOf('|');
    if (pipeIdx !== -1) {
      target = token.slice(0, pipeIdx).trim();
      alias = token.slice(pipeIdx + 1).trim();
    } else {
      target = token;
    }
  }

  // Check if it's a date link
  if (DATE_REGEX.test(target)) {
    return {
      raw: rawToken,
      target,
      alias,
      isDate: true,
      date: target,
      isTask: false,
    };
  }

  // Check if it's a task link by numeric ID (e.g. [[#42]] or [[42]] or [[#42 - Deploy API]])
  const taskMatch = TASK_ID_REGEX.exec(target);
  if (taskMatch) {
    const taskId = Number.parseInt(taskMatch[1], 10);
    return {
      raw: rawToken,
      target,
      alias,
      isDate: false,
      isTask: true,
      taskId,
    };
  }

  // Check if it's a task file link (e.g. tasks/2026-10-06-deploy.md)
  if (target.startsWith('tasks/') || target.endsWith('.md')) {
    const filename = target.replace(/^tasks\//, '');
    return {
      raw: rawToken,
      target,
      alias,
      isDate: false,
      isTask: true,
      taskFilename: filename,
    };
  }

  // Generic note / title link
  return {
    raw: rawToken,
    target,
    alias,
    isDate: false,
    isTask: false,
  };
}

export function extractAllWikilinks(content: string): ParsedWikilink[] {
  const matches: ParsedWikilink[] = [];
  let m: RegExpExecArray | null;
  const regex = new RegExp(WIKILINK_REGEX.source, 'g');

  while ((m = regex.exec(content)) !== null) {
    const parsed = parseWikilink(m[0]);
    if (parsed) matches.push(parsed);
  }

  return matches;
}
