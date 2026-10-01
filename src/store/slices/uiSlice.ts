import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { AppSettings, AppViewMode, DEFAULT_KANBAN_COLUMNS } from '../../types';
import i18n, { getSystemLanguage } from '../../i18n';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { flushTaskEditor } from '../../services/editorSession';
import { getReportPeriod, isReportView } from '../../utils/reportPeriod';
import { AppSlice, UiSlice } from '../types';

dayjs.extend(isoWeek);

export const createUiSlice: AppSlice<UiSlice> = (set, get) => ({
  currentView: 'daily',
  selectedDate: dayjs().format('YYYY-MM-DD'),
  isLoading: true,
  isSettingsOpen: false,
  settingsActiveTab: 'general',
  isOnboardingOpen: false,
  isSidebarCollapsed: false,

  initApp: async () => {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.getSettings();
        if (settings.language && i18n.language !== settings.language) {
          i18n.changeLanguage(settings.language);
        }
        const shouldShowOnboarding = !settings.hasCompletedOnboarding;
        set({
          settings,
          areas: settings.areas || DEFAULT_AREAS,
          projects: settings.projects || [],
          isLoading: false,
          isOnboardingOpen: shouldShowOnboarding,
        });
        await Promise.all([
          get().refreshNotesList(),
          get().refreshTasksList(),
          get().refreshTagsList(),
          get().loadRoutineCompletions(get().selectedDate),
          get().loadNoteForDate(get().selectedDate),
        ]);
      } else {
        // Fallback for browser testing if opened outside electron
        set({
          settings: {
            vaultPath: '/mock/vault',
            language: getSystemLanguage(),
            themeColor: 'indigo',
            colorScheme: 'auto',
            weekStartDay: 1,
            defaultTemplateId: 'standard-worklog',
            templates: [],
            kanbanColumns: DEFAULT_KANBAN_COLUMNS,
            autoSave: true,
            autoSaveDelay: 1000,
            dateFormat: 'YYYY-MM-DD',
            editorFontSize: 15,
            hasCompletedOnboarding: false,
            areas: DEFAULT_AREAS,
            projects: [],
          },
          areas: DEFAULT_AREAS,
          projects: [],
          isLoading: false,
          isOnboardingOpen: true,
        });
      }
    } catch (err) {
      console.error('Failed to init app:', err);
      set({ isLoading: false });
    }
  },

  openOnboarding: () => {
    set({ isOnboardingOpen: true });
  },

  closeOnboarding: () => {
    set({ isOnboardingOpen: false });
  },

  completeOnboarding: async (partial) => {
    const nextSettings: Partial<AppSettings> = {
      ...(partial || {}),
      hasCompletedOnboarding: true,
    };
    await get().updateSettings(nextSettings);
    set({ isOnboardingOpen: false });
  },

  toggleSidebarCollapse: (collapsed?: boolean) => {
    set((state) => ({
      isSidebarCollapsed: collapsed !== undefined ? collapsed : !state.isSidebarCollapsed,
    }));
  },

  setSelectedDate: async (date: string) => {
    if (date === get().selectedDate) return;
    // If current note is dirty, save it first before switching
    if (get().isDirty && get().activeNote) {
      const saved = await get().saveActiveNote({ force: true });
      if (!saved) return;
    }
    set({ selectedDate: date });
    await Promise.all([get().loadNoteForDate(date), get().loadRoutineCompletions(date)]);
  },

  setCurrentView: async (view: AppViewMode) => {
    const currentView = get().currentView;
    if (view === currentView) return;

    if (currentView === 'task') {
      const saved = await flushTaskEditor();
      if (!saved) return;
    }
    if (get().isDirty && get().activeNote) {
      const saved = await get().saveActiveNote({ force: true });
      if (!saved) return;
    }

    set({
      currentView: view,
      ...(isReportView(view) ? {
        reportPeriod: getReportPeriod(view),
        reportDate: get().hasOpenedReports ? get().reportDate : get().selectedDate,
        hasOpenedReports: true,
      } : {}),
    });
  },

  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },

  openSettings: (tab = 'general') => {
    set({ isSettingsOpen: true, settingsActiveTab: tab });
  },

  setSettingsActiveTab: (tab: string) => {
    set({ settingsActiveTab: tab });
  },

  openExternalUrl: async (url: string) => {
    if (!url) return;
    if (window.electronAPI?.openExternalUrl) {
      await window.electronAPI.openExternalUrl(url);
    } else {
      let target = url.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
      }
      window.open(target, '_blank');
    }
  },
});

