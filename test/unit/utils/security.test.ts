// @vitest-environment node
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { requireIsoDate, requireTaskFilename, requireTaskWriteInput, resolvePathInside } from '../../../electron/utils/security';

describe('security utils', () => {
  describe('requireIsoDate', () => {
    it('accepts valid ISO date strings', () => {
      expect(requireIsoDate('2026-09-02')).toBe('2026-09-02');
      expect(requireIsoDate('2024-02-29')).toBe('2024-02-29'); // Leap year
    });

    it('throws on non-existent calendar dates', () => {
      expect(() => requireIsoDate('2026-02-31')).toThrow(/Invalid date/);
      expect(() => requireIsoDate('2025-02-29')).toThrow(/Invalid date/);
      expect(() => requireIsoDate('2026-13-01')).toThrow(/Invalid date/);
    });

    it('throws on invalid formats', () => {
      expect(() => requireIsoDate('09-02-2026')).toThrow(/Invalid date/);
      expect(() => requireIsoDate('not-a-date')).toThrow(/Invalid date/);
      expect(() => requireIsoDate('')).toThrow(/Invalid date/);
    });
  });

  describe('requireTaskFilename', () => {
    it('normalizes task filenames with .md extension', () => {
      expect(requireTaskFilename('release-notes')).toBe('release-notes.md');
      expect(requireTaskFilename('task-1.md')).toBe('task-1.md');
    });

    it('rejects path traversal attempts', () => {
      expect(() => requireTaskFilename('../outside.md')).toThrow(/Invalid task filename/);
      expect(() => requireTaskFilename('/etc/passwd')).toThrow(/Invalid task filename/);
      expect(() => requireTaskFilename('sub/nested.md')).toThrow(/Invalid task filename/);
    });
  });

  describe('requireTaskWriteInput', () => {
    const validTask = {
      title: 'Prepare release',
      status: 'todo',
      content: 'Release checklist',
      due: '2026-10-15',
      tags: ['release'],
    };

    it('accepts a valid task payload and keeps only supported fields', () => {
      expect(requireTaskWriteInput({ ...validTask, unknown: 'discarded' })).toEqual(validTask);
    });

    it('rejects missing required fields and malformed optional values', () => {
      expect(() => requireTaskWriteInput(null)).toThrow(/Invalid task data/);
      expect(() => requireTaskWriteInput({ ...validTask, title: '  ' })).toThrow(/Invalid task title/);
      expect(() => requireTaskWriteInput({ ...validTask, status: '' })).toThrow(/Invalid task status/);
      expect(() => requireTaskWriteInput({ ...validTask, content: undefined })).toThrow(/Invalid task content/);
      expect(() => requireTaskWriteInput({ ...validTask, taskId: 0 })).toThrow(/Invalid task ID/);
      expect(() => requireTaskWriteInput({ ...validTask, filename: '../outside.md' })).toThrow(/Invalid task filename/);
      expect(() => requireTaskWriteInput({ ...validTask, priority: 'critical' })).toThrow(/Invalid task priority/);
      expect(() => requireTaskWriteInput({ ...validTask, due: '2026-02-31' })).toThrow(/Invalid task due/);
      expect(() => requireTaskWriteInput({ ...validTask, tags: ['release', 3] })).toThrow(/Invalid task tags/);
    });
  });

  describe('resolvePathInside', () => {
    const baseDir = path.resolve('/tmp/test-vault');

    it('resolves valid relative paths inside the base directory', () => {
      const resolved = resolvePathInside(baseDir, 'images/pic.png');
      expect(resolved).toBe(path.join(baseDir, 'images', 'pic.png'));
    });

    it('throws when attempting directory traversal outside the base directory', () => {
      expect(() => resolvePathInside(baseDir, '../secret.txt')).toThrow(/outside the allowed directory/);
      expect(() => resolvePathInside(baseDir, '../../etc/passwd')).toThrow(/outside the allowed directory/);
    });
  });
});
