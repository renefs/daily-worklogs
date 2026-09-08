import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { AppState } from './types';
import { createUiSlice } from './slices/uiSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createNotesSlice } from './slices/notesSlice';
import { createTasksSlice } from './slices/tasksSlice';
import { createAreasProjectsSlice } from './slices/areasProjectsSlice';
import { createTagsSlice } from './slices/tagsSlice';
import { createRoutinesSlice } from './slices/routinesSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createUiSlice(...a),
  ...createSettingsSlice(...a),
  ...createNotesSlice(...a),
  ...createTasksSlice(...a),
  ...createAreasProjectsSlice(...a),
  ...createTagsSlice(...a),
  ...createRoutinesSlice(...a),
}));

export function useAppStoreSelector<T>(selector: (state: AppState) => T): T {
  return useAppStore(useShallow(selector));
}

export * from './types';
