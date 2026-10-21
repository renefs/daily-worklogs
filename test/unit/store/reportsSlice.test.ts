import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useAppStore } from '../../../src/store/useAppStore';
import type { PeriodSummary } from '../../../src/types';

function summary(startDate = '2026-09-28', endDate = '2026-10-04'): PeriodSummary {
  return { startDate, endDate, title: '', totalDays: 7, activeDays: 0, totalTasks: 0, completedTasks: 0, days: [] };
}

describe('Reports store', () => {
  beforeEach(() => {
    useAppStore.setState({ currentView: 'daily', selectedDate: '2026-10-01', reportDate: '2026-10-01',
      reportPeriod: 'week', reportTab: 'dashboard', reportDaysExpanded: false, hasOpenedReports: false, reportSummary: null,
      isReportLoading: false, reportError: null, activeNote: null, isDirty: false, settings: null, notesList: [], tasks: [] });
    vi.mocked(window.electronAPI.getNotesRange).mockReset().mockResolvedValue(summary());
    vi.mocked(window.electronAPI.readNote).mockReset().mockResolvedValue({
      date: '2026-10-01', filename: '2026-10-01.md', filepath: '/mock/2026-10-01.md', content: '# Note content', exists: true,
    });
  });
  it('keeps the shared date and selected tab across period changes and returning to Reports', async () => {
    await useAppStore.getState().openReports();
    useAppStore.getState().setReportDate('2026-09-30');
    useAppStore.getState().setReportTab('days');
    await useAppStore.getState().openReports('month');
    expect(useAppStore.getState().reportDate).toBe('2026-09-30');
    expect(useAppStore.getState().reportTab).toBe('days');
    expect(window.electronAPI.getNotesRange).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30');
    await useAppStore.getState().setCurrentView('tasks');
    await useAppStore.getState().openReports();
    expect(useAppStore.getState().currentView).toBe('monthly');
    expect(useAppStore.getState().reportDate).toBe('2026-09-30');
  });
  it('ignores old responses during rapid navigation', async () => {
    let finishOld: ((result: PeriodSummary) => void) | undefined;
    vi.mocked(window.electronAPI.getNotesRange).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    await useAppStore.getState().openReports();
    useAppStore.getState().setReportDate('2026-10-08');
    await waitFor(() => expect(useAppStore.getState().isReportLoading).toBe(false));
    const latest = useAppStore.getState().reportSummary;
    finishOld?.(summary('2020-01-01', '2020-01-07'));
    await Promise.resolve();
    expect(useAppStore.getState().reportSummary).toBe(latest);
  });
  it('refreshes reports after vault changes and allows retry after failure', async () => {
    vi.mocked(window.electronAPI.getNotesRange).mockRejectedValueOnce(new Error('Vault unavailable'));
    await useAppStore.getState().openReports();
    await waitFor(() => expect(useAppStore.getState().reportError).toBe('Vault unavailable'));
    await useAppStore.getState().refreshReport();
    expect(useAppStore.getState().reportError).toBeNull();
    const calls = vi.mocked(window.electronAPI.getNotesRange).mock.calls.length;
    useAppStore.setState({ notesList: [] });
    expect(window.electronAPI.getNotesRange).toHaveBeenCalledTimes(calls + 1);
  });
  it('does not leave a dirty note or change the report anchor if saving fails', async () => {
    vi.mocked(window.electronAPI.writeNote).mockRejectedValueOnce(new Error('Disk unavailable'));
    useAppStore.setState({ activeNote: { date: '2026-10-01', filename: '2026-10-01.md', filepath: '', content: 'Draft', exists: true }, isDirty: true });
    await useAppStore.getState().openReports('year', '2024-01-01');
    expect(useAppStore.getState().currentView).toBe('daily');
    expect(useAppStore.getState().reportDate).toBe('2026-10-01');
  });
  it('keeps the current period when opening its task editor and returning', async () => {
    await useAppStore.getState().openReports('year', '2024-02-29');
    useAppStore.getState().setReportTab('tasks');
    await useAppStore.getState().openTaskEditor(undefined, undefined, 'yearly');
    useAppStore.getState().closeTaskEditor();
    expect(useAppStore.getState().currentView).toBe('yearly');
    expect(useAppStore.getState().reportDate).toBe('2024-02-29');
    expect(useAppStore.getState().reportTab).toBe('tasks');
  });
  it('preserves expanded days across week/month date changes and resets on period change or yearly view', async () => {
    vi.mocked(window.electronAPI.getNotesRange).mockResolvedValue({
      ...summary('2026-09-28', '2026-10-04'),
      days: [{ date: '2026-10-01', exists: true, tasksTotal: 1, tasksCompleted: 1 }],
    });
    await useAppStore.getState().openReports('week');
    useAppStore.getState().setReportDaysExpanded(true);
    useAppStore.getState().setReportDate('2026-10-08');
    expect(useAppStore.getState().reportDaysExpanded).toBe(true);
    await waitFor(() => expect(useAppStore.getState().isReportLoading).toBe(false));
    expect(window.electronAPI.readNote).toHaveBeenCalledWith('2026-10-01');
    expect(useAppStore.getState().reportSummary?.days[0]?.content).toBe('# Note content');

    await useAppStore.getState().openReports('month');
    expect(useAppStore.getState().reportDaysExpanded).toBe(false);

    useAppStore.getState().setReportDaysExpanded(true);
    useAppStore.getState().setReportDate('2026-11-01');
    expect(useAppStore.getState().reportDaysExpanded).toBe(true);

    await useAppStore.getState().openReports('year');
    expect(useAppStore.getState().reportDaysExpanded).toBe(false);
  });
});
