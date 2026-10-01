// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseNumericTaskId, parseTaskCounts } from '../../../electron/services/taskFileService';

describe('task file service helpers', () => {
  describe('parseNumericTaskId', () => {
    it('reads numeric and GitHub-style string IDs from frontmatter', () => {
      expect(parseNumericTaskId({ id: 4 })).toBe(4);
      expect(parseNumericTaskId({ id: '#12' })).toBe(12);
      expect(parseNumericTaskId({ taskId: '7' })).toBe(7);
    });

    it('prefers numeric aliases and rejects invalid IDs', () => {
      expect(parseNumericTaskId({ id: '#4', taskId: 8 })).toBe(8);
      expect(parseNumericTaskId({ id: '04' })).toBeUndefined();
      expect(parseNumericTaskId({ id: 0 })).toBeUndefined();
      expect(parseNumericTaskId(null)).toBeUndefined();
    });
  });

  describe('parseTaskCounts', () => {
    it('counts checked and unchecked Markdown checklist items', () => {
      expect(parseTaskCounts('- [x] Done\n* [ ] Next\n- [X] Also done')).toEqual({
        tasksCompleted: 2,
        tasksTotal: 3,
      });
    });
  });
});
