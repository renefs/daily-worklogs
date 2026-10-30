import dayjs from 'dayjs';
import { stripNotesSection } from '../../utils/dailyNoteSections';
import { getReportRange, REPORT_VIEWS } from '../../utils/reportPeriod';
import type { AppSlice, ReportsSlice } from '../types';

export const createReportsSlice: AppSlice<ReportsSlice> = (set, get) => {
  let requestId = 0;
  return {
    reportDate: dayjs().format('YYYY-MM-DD'),
    reportPeriod: 'week',
    reportTab: 'dashboard',
    reportDaysExpanded: false,
    hasOpenedReports: false,
    reportSummary: null,
    isReportLoading: false,
    reportError: null,

    setReportDate: (date) => {
      if (dayjs(date).isValid() && dayjs(date).format('YYYY-MM-DD') === date) {
        set((state) => ({
          reportDate: date,
          reportDaysExpanded: state.reportPeriod === 'year' ? false : state.reportDaysExpanded,
        }));
      }
    },
    setReportTab: (reportTab) =>
      set((state) => ({
        reportTab: state.reportPeriod === 'year' && reportTab === 'days' ? 'dashboard' : reportTab,
      })),
    setReportDaysExpanded: (reportDaysExpanded) => set({ reportDaysExpanded }),
    openReports: async (period = get().reportPeriod, date) => {
      const view = REPORT_VIEWS[period];
      await get().setCurrentView(view);
      if (get().currentView !== view) return;
      if (date) {
        set({ reportTab: 'dashboard' });
        get().setReportDate(date);
      }
    },
    openReportDay: async (date) => {
      await get().setSelectedDate(date);
      if (get().selectedDate !== date) return;
      await get().setCurrentView('daily');
      if (get().currentView === 'daily') set({ reportDate: date });
    },
    readReportDay: async (date) => {
      const note = await window.electronAPI.readNote(date);
      return stripNotesSection(note?.content ?? '');
    },
    refreshReport: async () => {
      const id = ++requestId;
      const { reportDate, reportPeriod, settings, reportSummary: existingSummary } = get();
      const range = getReportRange(reportDate, reportPeriod, settings?.weekStartDay ?? 1);
      const isSameRange =
        existingSummary?.startDate === range.start &&
        existingSummary?.endDate === range.end;
      if (isSameRange) {
        if (get().reportError !== null) set({ reportError: null });
      } else {
        set({ isReportLoading: true, reportError: null, reportSummary: null });
      }
      try {
        if (!window.electronAPI) throw new Error('Electron API is unavailable');
        const reportSummary = await window.electronAPI.getNotesRange(range.start, range.end);
        if (id !== requestId) return;
        const shouldPreload = get().reportDaysExpanded && get().reportPeriod !== 'year';
        const existingContentDates = new Set(
          isSameRange
            ? (existingSummary?.days ?? []).filter((d) => d.content !== undefined).map((d) => d.date)
            : []
        );
        if ((shouldPreload || existingContentDates.size > 0) && reportSummary.days?.length && window.electronAPI.readNote) {
          const daysWithContent = await Promise.all(
            reportSummary.days.map(async (day) => {
              if (!day.exists || day.content !== undefined) return day;
              if (!shouldPreload && !existingContentDates.has(day.date)) return day;
              const note = await window.electronAPI.readNote(day.date);
              return { ...day, content: stripNotesSection(note?.content ?? '') };
            })
          );
          if (id !== requestId) return;
          set({ reportSummary: { ...reportSummary, days: daysWithContent }, isReportLoading: false, reportError: null });
          return;
        }
        set({ reportSummary, isReportLoading: false, reportError: null });
      } catch (error) {
        if (id === requestId) set({ reportError: error instanceof Error ? error.message : 'Report loading failed', isReportLoading: false });
      }
    },
  };
};
