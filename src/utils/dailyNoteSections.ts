/**
 * Helpers for the reserved "Notes" section of a daily note.
 * Content under a heading that is exactly "Notes" is personal and excluded from reports.
 */

export const NOTES_SECTION_HEADING = 'Notes';

const HEADING_PATTERN = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const EMPTY_ITEM_PATTERN = /^[-*+][ \t]*(?:\[[ xX]\])?[ \t]*$/;

interface SectionRange {
  start: number;
  end: number;
}

function stripCarriageReturn(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

function parseHeading(line: string): { level: number; title: string } | null {
  const match = stripCarriageReturn(line).match(HEADING_PATTERN);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

function isNotesTitle(title: string): boolean {
  return title.toLowerCase() === NOTES_SECTION_HEADING.toLowerCase();
}

/** True when the line is a Markdown heading whose title is exactly "Notes" (any level, case-insensitive). */
export function isNotesHeading(line: string): boolean {
  const heading = parseHeading(line);
  return heading !== null && isNotesTitle(heading.title);
}

/** Calls `visit` for every heading line that is not inside a fenced code block. */
function forEachHeadingOutsideFences(
  lines: string[],
  visit: (index: number, heading: { level: number; title: string }) => void
): void {
  let fenceMarker: string | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = stripCarriageReturn(lines[index]);
    const fence = line.match(FENCE_PATTERN);
    if (fence) {
      const marker = fence[1][0];
      if (fenceMarker === null) fenceMarker = marker;
      else if (fenceMarker === marker) fenceMarker = null;
      continue;
    }
    if (fenceMarker !== null) continue;

    const heading = parseHeading(line);
    if (heading) visit(index, heading);
  }
}

/** Zero-based indexes of every recognised Notes heading line, ignoring fenced code blocks. */
export function findNotesHeadingLines(lines: string[]): number[] {
  const indexes: number[] = [];
  forEachHeadingOutsideFences(lines, (index, heading) => {
    if (isNotesTitle(heading.title)) indexes.push(index);
  });
  return indexes;
}

/** Finds line ranges of every Notes section, ignoring headings inside fenced code blocks. */
function findNotesSections(lines: string[]): SectionRange[] {
  const sections: SectionRange[] = [];
  let current = null as { start: number; level: number } | null;

  forEachHeadingOutsideFences(lines, (index, heading) => {
    if (current && heading.level <= current.level) {
      sections.push({ start: current.start, end: index });
      current = null;
    }
    if (!current && isNotesTitle(heading.title)) {
      current = { start: index, level: heading.level };
    }
  });
  if (current) sections.push({ start: current.start, end: lines.length });
  return sections;
}

/** True when the content has a recognised Notes heading (headings inside code fences do not count). */
export function hasNotesSection(content: string): boolean {
  return findNotesHeadingLines(content.split('\n')).length > 0;
}

export interface AppendNotesSectionChange {
  /** Document offset where the replacement starts (start of the trailing newlines). */
  from: number;
  /** Document offset where the replacement ends (end of the document). */
  to: number;
  /** Text to put in place of the trailing newlines. */
  insert: string;
  /** Document offset of the empty line under the new heading, after applying the change. */
  cursor: number;
}

/**
 * Describes the change that appends a `## Notes` section at the end of the document:
 * exactly one blank line before it when there is content, none when the document is empty.
 */
export function appendNotesSection(content: string): AppendNotesSectionChange {
  const hasContent = content.trim() !== '';
  const from = hasContent ? content.replace(/\n+$/, '').length : 0;
  const insert = `${hasContent ? '\n\n' : ''}## ${NOTES_SECTION_HEADING}\n`;
  return { from, to: content.length, insert, cursor: from + insert.length };
}

/** Removes every Notes section (heading through the next heading of the same or higher level). */
export function stripNotesSection(content: string): string {
  const lines = content.split('\n');
  const sections = findNotesSections(lines);
  if (sections.length === 0) return content;

  const kept: string[] = [];
  let cursor = 0;
  for (const section of sections) {
    kept.push(...lines.slice(cursor, section.start));
    cursor = section.end;
  }
  kept.push(...lines.slice(cursor));
  return kept.join('\n');
}

/** Inserts a block before the first Notes section, or at the end when there is none. */
export function insertBeforeNotesSection(content: string, block: string): string {
  const lines = content.split('\n');
  const [first] = findNotesSections(lines);
  const trimmedBlock = block.trim();
  if (!first) return `${content.trim()}\n\n${trimmedBlock}\n`;

  const before = lines.slice(0, first.start).join('\n').trim();
  const after = lines.slice(first.start).join('\n');
  return `${before ? `${before}\n\n` : ''}${trimmedBlock}\n\n${after}`;
}

/** Lines that older notes carry from the former built-in templates and that are not work. */
const PLACEHOLDER_LINES: ReadonlySet<string> = new Set(['- None']);

/** Content of a newly created daily note: an ISO date heading. */
export function createDailyNoteContent(date: string): string {
  return `# ${date}\n\n`;
}

/**
 * True when the work content has any line beyond headings, empty bullets/checkboxes,
 * or placeholder lines.
 */
export function hasWorkContent(workContent: string): boolean {
  return workContent.split('\n').some((rawLine) => {
    const line = rawLine.trim();
    if (!line) return false;
    if (parseHeading(line)) return false;
    if (EMPTY_ITEM_PATTERN.test(line)) return false;
    return !PLACEHOLDER_LINES.has(line);
  });
}
