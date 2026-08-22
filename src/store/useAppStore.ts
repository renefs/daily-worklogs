import { create } from 'zustand';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { AppSettings, AppViewMode, DailyNote } from '../types';
import i18n from '../i18n';

dayjs.extend(isoWeek);

interface AppState {
  settings: AppSettings | null;
  currentView: AppViewMode;
  selectedDate: string; // YYYY-MM-DD
  activeNote: DailyNote | null;
  isSaving: boolean;
  isDirty: boolean;
  notesList: Array<{ date: string; filename: string; lastModified: string; size: number }>;
  isSettingsOpen: boolean;
  isLoading: boolean;

  // Actions
  initApp: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setCurrentView: (view: AppViewMode) => void;
  loadNoteForDate: (date: string) => Promise<void>;
  setNoteContent: (content: string) => void;
  saveActiveNote: () => Promise<void>;
  deleteActiveNote: (date?: string) => Promise<void>;
  refreshNotesList: () => Promise<void>;
  applyTemplate: (templateId: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  toggleTaskInNote: (taskText: string, checked: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  currentView: 'daily',
  selectedDate: dayjs().format('YYYY-MM-DD'),
  activeNote: null,
  isSaving: false,
  isDirty: false,
  notesList: [],
  isSettingsOpen: false,
  isLoading: true,

  initApp: async () => {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.getSettings();
        if (settings.language && i18n.language !== settings.language) {
          i18n.changeLanguage(settings.language);
        }
        set({ settings, isLoading: false });
        await get().refreshNotesList();
        await get().loadNoteForDate(get().selectedDate);
      } else {
        // Fallback for browser testing if opened outside electron
        set({
          settings: {
            vaultPath: '/mock/vault',
            language: 'en',
            themeColor: 'indigo',
            colorScheme: 'auto',
            weekStartDay: 1,
            defaultTemplateId: 'standard-worklog',
            templates: [],
            autoSave: true,
            autoSaveDelay: 1000,
            dateFormat: 'YYYY-MM-DD',
            editorFontSize: 15,
          },
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('Failed to init app:', err);
      set({ isLoading: false });
    }
  },

  loadSettings: async () => {
    if (!window.electronAPI) return;
    const settings = await window.electronAPI.getSettings();
    set({ settings });
  },

  updateSettings: async (partial) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.saveSettings(partial);
    if (partial.language && i18n.language !== partial.language) {
      i18n.changeLanguage(partial.language);
    }
    set({ settings: updated });
    await get().refreshNotesList();
  },

  setSelectedDate: async (date: string) => {
    // If current note is dirty, save it first before switching
    if (get().isDirty && get().activeNote) {
      await get().saveActiveNote();
    }
    set({ selectedDate: date });
    await get().loadNoteForDate(date);
  },

  setCurrentView: (view: AppViewMode) => {
    set({ currentView: view });
  },

  loadNoteForDate: async (date: string) => {
    if (!window.electronAPI) return;
    try {
      const note = await window.electronAPI.readNote(date);
      set({ activeNote: note, isDirty: false });
    } catch (err) {
      console.error('Failed to read note:', err);
    }
  },

  setNoteContent: (content: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    // Count tasks
    const checked = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
    const unchecked = (content.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;

    set({
      activeNote: {
        ...activeNote,
        content,
        tasksCompleted: checked,
        tasksTotal: checked + unchecked,
      },
      isDirty: true,
    });
  },

  saveActiveNote: async () => {
    const { activeNote, isSaving } = get();
    if (!activeNote || !window.electronAPI || isSaving) return;

    set({ isSaving: true });
    try {
      const res = await window.electronAPI.writeNote(activeNote.date, activeNote.content);
      if (res.success) {
        set({
          isDirty: false,
          activeNote: {
            ...activeNote,
            exists: true,
            filepath: res.filepath,
            lastModified: res.lastModified,
          },
        });
        await get().refreshNotesList();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteActiveNote: async (targetDate?: string) => {
    const dateToDelete = targetDate || get().selectedDate;
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteNote(dateToDelete);
      await get().refreshNotesList();
      await get().loadNoteForDate(dateToDelete);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  },

  refreshNotesList: async () => {
    if (!window.electronAPI) return;
    try {
      const notes = await window.electronAPI.listNotes();
      set({ notesList: notes });
    } catch (err) {
      console.error('Failed to list notes:', err);
    }
  },

  applyTemplate: (templateId: string) => {
    const { settings, selectedDate, activeNote } = get();
    if (!settings || !activeNote) return;
    const template = settings.templates.find((t) => t.id === templateId);
    if (template) {
      const newContent = template.content.replace(/\{\{date\}\}/g, selectedDate);
      get().setNoteContent(newContent);
    }
  },

  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },

  toggleTaskInNote: (taskText: string, checked: boolean) => {
    const { activeNote } = get();
    if (!activeNote) return;
    
    // Replace markdown checklist item
    const escaped = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const oldRegex = new RegExp(`^([\\s]*[-*]\\s*\\[)([ xX])(\\]\\s*${escaped})`, 'm');
    const newContent = activeNote.content.replace(oldRegex, `$1${checked ? 'x' : ' '}$3`);
    
    if (newContent !== activeNote.content) {
      get().setNoteContent(newContent);
      get().saveActiveNote();
    }
  },
}));
