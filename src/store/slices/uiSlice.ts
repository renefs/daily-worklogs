import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { AppSettings, AppViewMode, DEFAULT_KANBAN_COLUMNS, TaskItem } from '../../types';
import i18n, { getSystemLanguage } from '../../i18n';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { DEFAULT_THEME_COLOR } from '../../shared/defaultData';
import { flushTaskEditor } from '../../services/editorSession';
import { getReportPeriod, isReportView } from '../../utils/reportPeriod';
import { DEFAULT_SETTINGS_SECTION } from '../../utils/settingsSections';
import { AppSlice, AppState, UiSlice } from '../types';

dayjs.extend(isoWeek);

type StoreGet = () => AppState;
type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;

/**
 * Switches the visible view after flushing the open task draft and the dirty note.
 * Resolves to false, leaving all state untouched, when a flush fails so edits are never dropped.
 * `extraState` is applied in the same update as the view change.
 */
async function navigateToView(
  get: StoreGet,
  set: StoreSet,
  view: AppViewMode,
  extraState: Partial<AppState> = {}
): Promise<boolean> {
  const currentView = get().currentView;
  if (view === currentView) return true;

  if (currentView === 'task') {
    const saved = await flushTaskEditor();
    if (!saved) return false;
  }
  if (get().isDirty && get().activeNote) {
    const saved = await get().saveActiveNote({ force: true });
    if (!saved) return false;
  }

  const nextReportPeriod = isReportView(view) ? getReportPeriod(view) : null;
  set({
    ...extraState,
    currentView: view,
    ...(nextReportPeriod ? {
      reportPeriod: nextReportPeriod,
      reportTab: nextReportPeriod === 'year' && get().reportTab === 'days' ? 'dashboard' : get().reportTab,
      reportDaysExpanded: nextReportPeriod !== get().reportPeriod ? false : get().reportDaysExpanded,
      reportDate: get().hasOpenedReports ? get().reportDate : get().selectedDate,
      hasOpenedReports: true,
    } : {}),
  });
  return true;
}

export const createUiSlice: AppSlice<UiSlice> = (set, get) => ({
  currentView: 'daily',
  selectedDate: dayjs().format('YYYY-MM-DD'),
  isLoading: true,
  settingsActiveTab: DEFAULT_SETTINGS_SECTION,
  settingsReturnView: 'daily',
  isOnboardingOpen: false,
  isSidebarCollapsed: false,
  appInfo: null,

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
          isOnboardingOpen: shouldShowOnboarding,
        });
        await Promise.all([
          get().refreshNotesList(),
          get().refreshTasksList(),
          get().refreshTagsList(),
          get().loadRoutineCompletions(get().selectedDate),
          get().loadNoteForDate(get().selectedDate),
          window.electronAPI.getAppInfo?.().then(
            (appInfo) => set({ appInfo }),
            (err: unknown) => console.error('Failed to get app info:', err)
          ),
        ]);
        set({ isLoading: false });
      } else {
        // Fallback for browser testing if opened outside electron
        set({
          settings: {
            vaultPath: '/mock/vault',
            language: getSystemLanguage(),
            themeColor: DEFAULT_THEME_COLOR,
            colorScheme: 'auto',
            weekStartDay: 1,
            kanbanColumns: DEFAULT_KANBAN_COLUMNS,
            autoSave: true,
            autoSaveDelay: 1000,
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
    await navigateToView(get, set, view);
  },

  openSettings: async (tab) => {
    const state = get();
    if (state.currentView === 'settings') {
      // Already there: just switch section and make sure nothing floats above the page.
      set({
        settingsActiveTab: tab ?? state.settingsActiveTab,
        isRoutinesDrawerOpen: false,
      });
      return;
    }

    // Section, return view and drawer change in the same update as the view, so a refused
    // navigation (failed flush) leaves every one of them untouched.
    await navigateToView(get, set, 'settings', {
      settingsReturnView: state.currentView,
      settingsActiveTab: tab ?? state.settingsActiveTab,
      isRoutinesDrawerOpen: false,
    });
  },

  closeSettings: async () => {
    if (get().currentView !== 'settings') return;
    let target = get().settingsReturnView;

    if (target === 'task') {
      // Settings may have changed this task on disk (moved column, renamed tag), so reopen the fresh copy.
      const active = get().activeTask;
      let fresh: TaskItem | null = null;
      if (active?.filename && window.electronAPI) {
        try {
          fresh = await window.electronAPI.readTask(active.filename);
        } catch {
          fresh = null;
        }
      }
      if (fresh) {
        set({ activeTask: fresh, isTaskDirty: false });
      } else if (active?.filename) {
        // The task is gone, so fall back to where the task editor would have returned.
        target = get().previousView === 'task' ? 'tasks' : get().previousView;
        set({ activeTask: null, isTaskDirty: false });
      }
    }
    await navigateToView(get, set, target);
  },

  setSettingsActiveTab: (tab) => {
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

