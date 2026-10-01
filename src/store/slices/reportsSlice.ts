import dayjs from 'dayjs';
import { getReportRange, REPORT_VIEWS } from '../../utils/reportPeriod';
import type { AppSlice, ReportsSlice } from '../types';

export const createReportsSlice: AppSlice<ReportsSlice> = (set, get) => {
  let requestId = 0;
  return {
    reportDate: dayjs().format('YYYY-MM-DD'),
    reportPeriod: 'week',
    reportTab: 'dashboard',
    hasOpenedReports: false,
    reportSummary: null,
    isReportLoading: false,
    reportError: null,

    setReportDate: (date) => {
      if (dayjs(date).isValid() && dayjs(date).format('YYYY-MM-DD') === date) set({ reportDate: date });
    },
    setReportTab: (reportTab) => set({ reportTab }),
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
      return note?.content ?? '';
    },
    refreshReport: async () => {
      const id = ++requestId;
      const { reportDate, reportPeriod, settings } = get();
      const range = getReportRange(reportDate, reportPeriod, settings?.weekStartDay ?? 1);
      set({ isReportLoading: true, reportError: null, reportSummary: null });
      try {
        if (!window.electronAPI) throw new Error('Electron API is unavailable');
        const reportSummary = await window.electronAPI.getNotesRange(range.start, range.end);
        if (id === requestId) set({ reportSummary, isReportLoading: false });
      } catch (error) {
        if (id === requestId) set({ reportError: error instanceof Error ? error.message : 'Report loading failed', isReportLoading: false });
      }
    },
  };
};
