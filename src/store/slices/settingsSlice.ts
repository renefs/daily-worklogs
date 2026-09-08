import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import i18n from '../../i18n';
import { AppSlice, SettingsSlice } from '../types';
import { invalidateNotesRefresh } from './notesSlice';
import { invalidateTasksRefresh } from './tasksSlice';

export const createSettingsSlice: AppSlice<SettingsSlice> = (set, get) => ({
  settings: null,

  loadSettings: async () => {
    if (!window.electronAPI) return;
    const settings = await window.electronAPI.getSettings();
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
    set({
      settings,
      areas: settings.areas || DEFAULT_AREAS,
      projects: settings.projects || [],
    });
  },

  updateSettings: async (partial) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.saveSettings(partial);
    if (updated.language && i18n.language !== updated.language) {
      i18n.changeLanguage(updated.language);
    }
    set({
      settings: updated,
      areas: updated.areas || DEFAULT_AREAS,
      projects: updated.projects || [],
    });
    if (partial.vaultPath) {
      invalidateNotesRefresh();
      await get().refreshNotesList();
    }
    if (partial.vaultPath) {
      invalidateTasksRefresh();
      await get().refreshTasksList();
      await get().loadNoteForDate(get().selectedDate);
    }
  },
});
