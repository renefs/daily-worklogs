import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { AppState } from './types';
import { createReportsSlice } from './slices/reportsSlice';
import { isReportView } from '../utils/reportPeriod';
import { createUiSlice } from './slices/uiSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createNotesSlice } from './slices/notesSlice';
import { createTasksSlice } from './slices/tasksSlice';
import { createAreasProjectsSlice } from './slices/areasProjectsSlice';
import { createTagsSlice } from './slices/tagsSlice';
import { createRoutinesSlice } from './slices/routinesSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createUiSlice(...a),
  ...createReportsSlice(...a),
  ...createSettingsSlice(...a),
  ...createNotesSlice(...a),
  ...createTasksSlice(...a),
  ...createAreasProjectsSlice(...a),
  ...createTagsSlice(...a),
  ...createRoutinesSlice(...a),
}));

// Reports refresh from store events so views do not synchronize IPC data with effects.
useAppStore.subscribe((state, previous) => {
  if (!isReportView(state.currentView)) return;
  if (state.currentView !== previous.currentView || state.reportDate !== previous.reportDate ||
      state.reportPeriod !== previous.reportPeriod || state.notesList !== previous.notesList ||
      state.tasks !== previous.tasks || state.settings?.weekStartDay !== previous.settings?.weekStartDay ||
      state.settings?.vaultPath !== previous.settings?.vaultPath) {
    void state.refreshReport();
  }
});

export function useAppStoreSelector<T>(selector: (state: AppState) => T): T {
  return useAppStore(useShallow(selector));
}

export * from './types';
