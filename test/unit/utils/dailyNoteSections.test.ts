import { describe, expect, it } from 'vitest';
import {
  appendNotesSection,
  createDailyNoteContent,
  findNotesHeadingLines,
  hasNotesSection,
  hasWorkContent,
  insertBeforeNotesSection,
  isNotesHeading,
  stripNotesSection,
} from '../../../src/utils/dailyNoteSections';

describe('stripNotesSection', () => {
  it('returns content unchanged when there is no Notes section', () => {
    const content = '# Day\n\n## Work\n- [x] Done\n';
    expect(stripNotesSection(content)).toBe(content);
  });

  it('removes the section up to the next heading of the same level', () => {
    const content = '# Day\n\n## Notes\nprivate\n\n## Tasks\n- [x] Done\n';
    expect(stripNotesSection(content)).toBe('# Day\n\n## Tasks\n- [x] Done\n');
  });

  it('keeps nested deeper headings inside the Notes section', () => {
    const content = '## Notes\n### Idea\nprivate\n## Work\npublic\n';
    expect(stripNotesSection(content)).toBe('## Work\npublic\n');
  });

  it('stops at a heading of a higher level', () => {
    const content = '# Day\n### Notes\nprivate\n## Work\npublic\n';
    expect(stripNotesSection(content)).toBe('# Day\n## Work\npublic\n');
  });

  it('removes multiple Notes sections', () => {
    const content = '## Notes\na\n## Work\nw\n## notes\nb\n';
    expect(stripNotesSection(content)).toBe('## Work\nw');
  });

  it('removes a trailing Notes section until end of file', () => {
    expect(stripNotesSection('## Work\nw\n## Notes\nprivate\nmore')).toBe('## Work\nw');
  });

  it('matches case-insensitively and at any heading level', () => {
    expect(stripNotesSection('# NOTES\nx\n')).toBe('');
    expect(stripNotesSection('###### nOtEs\nx\n')).toBe('');
  });

  it('does not match headings that merely contain Notes', () => {
    const content = '## 🚧 Blockers & Notes\n- a\n## 📝 General Meeting & Discussion Notes\n- b\n';
    expect(stripNotesSection(content)).toBe(content);
  });

  it('ignores headings inside fenced code blocks', () => {
    const content = '## Work\n```md\n## Notes\n```\nstill work\n';
    expect(stripNotesSection(content)).toBe(content);
  });

  it('does not end a Notes section on a heading inside a fenced code block', () => {
    const content = '## Notes\n```\n## Work\n```\nprivate\n## Tasks\nt\n';
    expect(stripNotesSection(content)).toBe('## Tasks\nt\n');
  });

  it('handles CRLF line endings', () => {
    const content = '## Work\r\nw\r\n## Notes\r\nprivate\r\n## Tasks\r\nt\r\n';
    expect(stripNotesSection(content)).toBe('## Work\r\nw\r\n## Tasks\r\nt\r\n');
  });
});

describe('insertBeforeNotesSection', () => {
  it('appends at the end when there is no Notes section', () => {
    expect(insertBeforeNotesSection('# Day\n- a\n', '### Log\n- x')).toBe('# Day\n- a\n\n### Log\n- x\n');
  });

  it('inserts before the first Notes section', () => {
    const result = insertBeforeNotesSection('# Day\n- a\n\n## Notes\nprivate\n', '### Log\n- x');
    expect(result).toBe('# Day\n- a\n\n### Log\n- x\n\n## Notes\nprivate\n');
    expect(stripNotesSection(result)).toContain('### Log');
  });

  it('ignores a Notes heading inside a code fence', () => {
    const content = '```\n## Notes\n```\n';
    expect(insertBeforeNotesSection(content, 'x')).toBe('```\n## Notes\n```\n\nx\n');
  });
});

describe('hasWorkContent', () => {
  it('is false for an untouched legacy template', () => {
    expect(hasWorkContent('# 2026-10-01 - Daily Worklog\n\n## Blockers\n- None\n\n## Tasks\n- [ ] \n')).toBe(false);
  });

  it('is false for empty content and empty items', () => {
    expect(hasWorkContent('')).toBe(false);
    expect(hasWorkContent('- \n* [ ]\n- [x] \n')).toBe(false);
  });

  it('is true when a line goes beyond headings and placeholder lines', () => {
    expect(hasWorkContent('## Tasks\n- [x] Shipped\n')).toBe(true);
    expect(hasWorkContent('Just a paragraph')).toBe(true);
  });

  it('compares the "- None" placeholder trimmed', () => {
    expect(hasWorkContent('  - None  \r\n')).toBe(false);
  });
});

describe('createDailyNoteContent', () => {
  it('creates an ISO date heading', () => {
    expect(createDailyNoteContent('2026-10-01')).toBe('# 2026-10-01\n\n');
  });

  it('does not count as logged work', () => {
    expect(hasWorkContent(createDailyNoteContent('2026-10-01'))).toBe(false);
  });
});

describe('Notes heading detection', () => {
  it('recognises Notes headings at any level, case-insensitively', () => {
    expect(isNotesHeading('# Notes')).toBe(true);
    expect(isNotesHeading('### notes')).toBe(true);
    expect(isNotesHeading('## NOTES ##')).toBe(true);
    expect(isNotesHeading('## Notes\r')).toBe(true);
  });

  it('rejects other titles and non-headings', () => {
    expect(isNotesHeading('## Notes list')).toBe(false);
    expect(isNotesHeading('Notes')).toBe(false);
    expect(isNotesHeading('    ## Notes')).toBe(false);
  });

  it('finds Notes heading lines outside fenced code blocks only', () => {
    const lines = ['## Notes', '```', '## Notes', '```', '- item', '### Notes'];
    expect(findNotesHeadingLines(lines)).toEqual([0, 5]);
  });
});

function applyAppend(content: string): { result: string; cursor: number } {
  const { from, to, insert, cursor } = appendNotesSection(content);
  return { result: content.slice(0, from) + insert + content.slice(to), cursor };
}

describe('appendNotesSection', () => {
  it('adds the heading without a leading blank line to an empty document', () => {
    const { result, cursor } = applyAppend('');
    expect(result).toBe('## Notes\n');
    expect(cursor).toBe(result.length);
  });

  it('adds exactly one blank line before the heading when the document has content', () => {
    expect(applyAppend('# Day').result).toBe('# Day\n\n## Notes\n');
    expect(applyAppend('# Day\n').result).toBe('# Day\n\n## Notes\n');
    expect(applyAppend('# Day\n\n').result).toBe('# Day\n\n## Notes\n');
    expect(applyAppend('# Day\n\n\n\n').result).toBe('# Day\n\n## Notes\n');
  });

  it('treats whitespace-only newlines as an empty document', () => {
    expect(applyAppend('\n\n').result).toBe('## Notes\n');
  });

  it('places the cursor on the empty line under the heading', () => {
    const { result, cursor } = applyAppend('# Day\n- [ ] a');
    expect(result.slice(0, cursor).endsWith('## Notes\n')).toBe(true);
    expect(cursor).toBe(result.length);
  });

  it('produces a heading that is recognised as a Notes section', () => {
    expect(hasNotesSection(applyAppend('# Day').result)).toBe(true);
  });
});

describe('hasNotesSection', () => {
  it('ignores Notes headings inside code fences', () => {
    expect(hasNotesSection('```\n## Notes\n```\n')).toBe(false);
    expect(hasNotesSection('# Day\n\n## Notes\nx')).toBe(true);
  });
});
