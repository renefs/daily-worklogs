import { notifications } from '@mantine/notifications';
import { DailyNote, DailyNoteMeta } from '../../types';
import i18n from '../../i18n';
import { formatTemplateContent } from '../../utils/dateTemplate';
import { AppSlice, NotesSlice } from '../types';

let notesRefreshGeneration = 0;
let notesRefreshInFlight: { generation: number; promise: Promise<DailyNoteMeta[]> } | null = null;
let noteEditRevision = 0;
let noteSaveInFlight: Promise<boolean> | null = null;

export function invalidateNotesRefresh(): void {
  notesRefreshGeneration += 1;
  notesRefreshInFlight = null;
}

export const createNotesSlice: AppSlice<NotesSlice> = (set, get) => ({
  activeNote: null,
  isSaving: false,
  isDirty: false,
  noteSaveError: null,
  externalNoteConflict: null,
  notesList: [],

  loadNoteForDate: async (date: string) => {
    if (!window.electronAPI) return;
    try {
      const note = await window.electronAPI.readNote(date);
      if (get().selectedDate === date) set({ activeNote: note, isDirty: false, noteSaveError: null });
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

    noteEditRevision += 1;
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

  saveActiveNote: async (_options?: { force?: boolean }) => {
    const requestedNote = get().activeNote;
    if (!requestedNote || !window.electronAPI) return false;

    if (noteSaveInFlight) {
      const inFlight = noteSaveInFlight;
      const previousSaveSucceeded = await inFlight;
      if (noteSaveInFlight === inFlight) noteSaveInFlight = null;
      const current = get().activeNote;
      if (!previousSaveSucceeded) return false;
      if (current?.date === requestedNote.date && get().isDirty) {
        return get().saveActiveNote(_options);
      }
      return true;
    }

    const saveOperation = (async (): Promise<boolean> => {
      set({ isSaving: true, noteSaveError: null });
      try {
        let noteToSave: DailyNote | null = get().activeNote;
        while (noteToSave) {
          const savingRevision = noteEditRevision;
          const res = await window.electronAPI.writeNote(noteToSave.date, noteToSave.content);
          if (!res.success) throw new Error('The note could not be written to disk');

          const current = get().activeNote;
          if (!current || current.date !== noteToSave.date) return false;
          const hasNewerEdits = noteEditRevision !== savingRevision;
          set({
            isDirty: hasNewerEdits,
            activeNote: {
              ...current,
              exists: true,
              filepath: res.filepath,
              lastModified: res.lastModified,
            },
          });
          invalidateNotesRefresh();
          if (!hasNewerEdits) break;
          noteToSave = get().activeNote;
        }
        await get().refreshNotesList();
        notifications.hide('note-save-error');
        return true;
      } catch (err) {
        console.error('Failed to save note:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown save error';
        set({ noteSaveError: errorMessage, isDirty: true });
        try {
          notifications.show({
            id: 'note-save-error',
            title: i18n.t('editor.saveFailed') || 'The note could not be saved',
            message: i18n.t('editor.saveFailedDescription') || 'Your changes are still available. Try saving again.',
            color: 'red',
            autoClose: false,
          });
        } catch {
          // Ignore notification failures in non-browser environments.
        }
        return false;
      } finally {
        set({ isSaving: false });
      }
    })();

    noteSaveInFlight = saveOperation;
    try {
      return await saveOperation;
    } finally {
      if (noteSaveInFlight === saveOperation) noteSaveInFlight = null;
    }
  },

  handleExternalNoteChange: (change) => {
    const { activeNote, isDirty } = get();
    if (!activeNote || activeNote.date !== change.date) return;
    if (activeNote.content === change.content && change.exists) return;
    // A single atomic save can produce several delayed watcher events. Once the
    // save response has updated the note metadata, ignore duplicate events for
    // that exact on-disk revision even if the user has already typed more text.
    if (change.exists && activeNote.lastModified && change.lastModified === activeNote.lastModified) return;
    if (isDirty) {
      set({ externalNoteConflict: change });
      return;
    }
    noteEditRevision += 1;
    set({
      activeNote: {
        ...activeNote,
        content: change.content,
        exists: change.exists,
        lastModified: change.lastModified,
      },
      isDirty: false,
      noteSaveError: null,
      externalNoteConflict: null,
    });
  },

  acceptExternalNote: () => {
    const { activeNote, externalNoteConflict } = get();
    if (!activeNote || !externalNoteConflict || activeNote.date !== externalNoteConflict.date) return;
    noteEditRevision += 1;
    set({
      activeNote: {
        ...activeNote,
        content: externalNoteConflict.content,
        exists: externalNoteConflict.exists,
        lastModified: externalNoteConflict.lastModified,
      },
      isDirty: false,
      noteSaveError: null,
      externalNoteConflict: null,
    });
  },

  keepLocalNote: async () => {
    set({ externalNoteConflict: null, isDirty: true });
    await get().saveActiveNote();
  },

  deleteActiveNote: async (targetDate?: string) => {
    const dateToDelete = targetDate || get().selectedDate;
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteNote(dateToDelete);
      invalidateNotesRefresh();
      await get().refreshNotesList();
      if (get().selectedDate === dateToDelete) {
        await get().loadNoteForDate(dateToDelete);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  },

  refreshNotesList: async () => {
    if (!window.electronAPI) return;
    try {
      const generation = notesRefreshGeneration;
      if (!notesRefreshInFlight || notesRefreshInFlight.generation !== generation) {
        notesRefreshInFlight = { generation, promise: window.electronAPI.listNotes() };
      }
      const request = notesRefreshInFlight;
      const notes = await request.promise;
      if (request.generation === notesRefreshGeneration) set({ notesList: notes });
      if (notesRefreshInFlight === request) notesRefreshInFlight = null;
    } catch (err) {
      console.error('Failed to list notes:', err);
    }
  },

  applyTemplate: (templateId: string) => {
    const { settings, selectedDate, activeNote } = get();
    if (!settings || !activeNote) return;
    const template = settings.templates.find((t) => t.id === templateId);
    if (template) {
      const newContent = formatTemplateContent(
        template.content,
        selectedDate,
        settings.dateFormat,
        settings.language || (i18n.language === 'es' ? 'es' : 'en')
      );
      get().setNoteContent(newContent);
    }
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
});

