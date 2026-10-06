import { describe, it, expect } from 'vitest';
import { parseWikilink, extractAllWikilinks } from '../../../src/utils/wikilinkUtils';

describe('wikilinkUtils', () => {
  describe('parseWikilink', () => {
    it('parses standard date wikilink', () => {
      const parsed = parseWikilink('[[2026-10-06]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isDate).toBe(true);
      expect(parsed?.date).toBe('2026-10-06');
      expect(parsed?.isTask).toBe(false);
      expect(parsed?.alias).toBeUndefined();
    });

    it('parses date wikilink with alias', () => {
      const parsed = parseWikilink('[[2026-10-06|Tuesday Note]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isDate).toBe(true);
      expect(parsed?.date).toBe('2026-10-06');
      expect(parsed?.alias).toBe('Tuesday Note');
    });

    it('parses unbracketed date token', () => {
      const parsed = parseWikilink('2026-10-06');
      expect(parsed).not.toBeNull();
      expect(parsed?.isDate).toBe(true);
      expect(parsed?.date).toBe('2026-10-06');
    });

    it('parses task numeric ID link', () => {
      const parsed = parseWikilink('[[#42]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isTask).toBe(true);
      expect(parsed?.taskId).toBe(42);
      expect(parsed?.isDate).toBe(false);
    });

    it('parses task with ID and title in target', () => {
      const parsed = parseWikilink('[[#105 - Implement SSO Auth]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isTask).toBe(true);
      expect(parsed?.taskId).toBe(105);
    });

    it('parses task link with alias', () => {
      const parsed = parseWikilink('[[#105|SSO Task]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isTask).toBe(true);
      expect(parsed?.taskId).toBe(105);
      expect(parsed?.alias).toBe('SSO Task');
    });

    it('parses task filename link', () => {
      const parsed = parseWikilink('[[tasks/implement-sso.md]]');
      expect(parsed).not.toBeNull();
      expect(parsed?.isTask).toBe(true);
      expect(parsed?.taskFilename).toBe('implement-sso.md');
    });

    it('returns null on empty input', () => {
      expect(parseWikilink('')).toBeNull();
      expect(parseWikilink('   ')).toBeNull();
    });
  });

  describe('extractAllWikilinks', () => {
    it('extracts all valid wikilinks from text', () => {
      const markdown = `
# Daily Worklog
Discussed with team regarding [[2026-10-05|yesterday's notes]].
Follow up on [[#42 - Deploy API]] and [[tasks/database-migration.md]].
Also referenced [[2026-10-07]].
      `;

      const links = extractAllWikilinks(markdown);
      expect(links).toHaveLength(4);
      expect(links[0].date).toBe('2026-10-05');
      expect(links[0].alias).toBe("yesterday's notes");
      expect(links[1].taskId).toBe(42);
      expect(links[2].taskFilename).toBe('database-migration.md');
      expect(links[3].date).toBe('2026-10-07');
    });

    it('returns empty array when text contains no wikilinks', () => {
      const links = extractAllWikilinks('Simple markdown without links');
      expect(links).toEqual([]);
    });
  });
});
