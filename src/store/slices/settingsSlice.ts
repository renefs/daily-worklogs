import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import i18n from '../../i18n';
import { flushTaskEditor } from '../../services/editorSession';
import { AppSlice, AppState, SettingsSlice } from '../types';
import { invalidateNotesRefresh } from './notesSlice';
import { invalidateTasksRefresh } from './tasksSlice';

type StoreGet = () => AppState;
type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;

/**
 * Reloads everything that lives inside the vault folder (notes, tasks, tags and
 * routine completions) after the active vault changed.
 */
async function refreshVaultContent(get: StoreGet, set: StoreSet, vaultChanged: boolean): Promise<void> {
  invalidateNotesRefresh();
  invalidateTasksRefresh();

  if (vaultChanged) {
    // The open task belongs to the previous vault, so it cannot stay on screen or be returned to.
    const { currentView, previousView, settingsReturnView } = get();
    const fallbackView = previousView === 'task' ? 'tasks' : previousView;
    set({
      activeTask: null,
      isTaskModalOpen: false,
      isTaskDirty: false,
      routineCompletionsByDate: {},
      ...(currentView === 'task' ? { currentView: fallbackView } : {}),
      ...(settingsReturnView === 'task' ? { settingsReturnView: fallbackView } : {}),
    });
  }

  const selectedDate = get().selectedDate;
  await Promise.all([
    get().refreshNotesList(),
    get().refreshTasksList(),
    get().refreshTagsList(),
    get().loadRoutineCompletions(selectedDate),
  ]);
  await get().loadNoteForDate(selectedDate);
}

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
    const previousVaultPath = get().settings?.vaultPath;
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
      await refreshVaultContent(get, set, updated.vaultPath !== previousVaultPath);
    }
  },

  reloadVaultData: async () => {
    if (!window.electronAPI) return;
    const previousVaultPath = get().settings?.vaultPath;
    await get().loadSettings();
    await refreshVaultContent(get, set, get().settings?.vaultPath !== previousVaultPath);
  },

  changeVault: async () => {
    if (!window.electronAPI?.selectVaultDirectory) return null;

    // The vault switches inside the main process, so pending edits must be written to the old vault first.
    if (get().currentView === 'task' && !(await flushTaskEditor())) return null;
    if (get().isDirty && get().activeNote && !(await get().saveActiveNote({ force: true }))) return null;

    const selected = await window.electronAPI.selectVaultDirectory();
    if (!selected) return null;
    await get().reloadVaultData();
    return selected;
  },
});
