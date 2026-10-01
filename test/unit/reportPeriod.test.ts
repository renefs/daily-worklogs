import { describe, expect, it } from 'vitest';
import { formatReportPeriod, getReportRange, moveReportDate } from '../../src/utils/reportPeriod';

describe('Report period navigation', () => {
  it('uses the configured first day of the week across month boundaries', () => {
    expect(getReportRange('2026-10-01', 'week', 1)).toEqual({ start: '2026-09-28', end: '2026-10-04', totalDays: 7 });
    expect(getReportRange('2026-10-01', 'week', 0)).toEqual({ start: '2026-09-27', end: '2026-10-03', totalDays: 7 });
    expect(getReportRange('2026-10-01', 'week', 3).start).toBe('2026-09-30');
  });
  it('includes both years for a cross-year week', () => {
    expect(formatReportPeriod('2027-01-01', 'week')).toBe('28 Dec 2026 – 3 Jan 2027');
  });
  it('counts leap years and moves months without skipping February', () => {
    expect(getReportRange('2024-02-29', 'year').totalDays).toBe(366);
    expect(getReportRange('2024-02-29', 'month').totalDays).toBe(29);
    expect(moveReportDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
    expect(moveReportDate('2024-02-29', 'year', 1)).toBe('2025-02-28');
  });
  it('formats localized month names', () => {
    expect(formatReportPeriod('2026-10-01', 'month', 1, 'es')).toBe('octubre 2026');
  });
});
