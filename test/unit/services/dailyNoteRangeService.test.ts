// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { summarizeDailyNotesInRange } from '../../../electron/services/dailyNoteRangeService';

describe('summarizeDailyNotesInRange', () => {
  let vault: string;

  const writeNote = (date: string, content: string) => {
    const dir = path.join(vault, date.slice(0, 4));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${date}.md`), content);
  };

  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), 'range-test-'));
  });

  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });

  it('excludes Notes checkboxes from counts and checklist items', async () => {
    writeNote('2026-10-01', '# Day\n\n## Work\n- [x] Shipped\n- [ ] Review\n\n## Notes\n- [x] Buy milk\n- [ ] Call mom\n');
    const summary = await summarizeDailyNotesInRange(vault, '2026-10-01', '2026-10-01', 2);
    expect(summary.activeDays).toBe(1);
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.dailyChecklistItems.map((item) => item.text)).toEqual(['Shipped', 'Review']);
    expect(summary.days[0].checklistItems).toHaveLength(2);
  });

  it('skips days that only contain Notes', async () => {
    writeNote('2026-10-01', '# Day\n\n## Notes\n- [x] Personal\nSome thoughts\n');
    writeNote('2026-10-02', '# Day\n\n- [x] Real work\n');
    const summary = await summarizeDailyNotesInRange(vault, '2026-10-01', '2026-10-02', 2);
    expect(summary.days.map((day) => day.date)).toEqual(['2026-10-02']);
    expect(summary.activeDays).toBe(1);
    expect(summary.totalTasks).toBe(1);
  });

  it('skips untouched legacy template days', async () => {
    writeNote('2026-10-01', '# 2026-10-01\n\n## Tasks\n- [ ] \n\n## Blockers\n- None\n\n## Notes\n');
    const summary = await summarizeDailyNotesInRange(vault, '2026-10-01', '2026-10-01', 2);
    expect(summary.days).toHaveLength(0);
    expect(summary.activeDays).toBe(0);
    expect(summary.totalTasks).toBe(0);
  });
});
