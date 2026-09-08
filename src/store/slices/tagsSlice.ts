import { TagDefinition } from '../../types';
import { AppSlice, TagsSlice } from '../types';

export const createTagsSlice: AppSlice<TagsSlice> = (set, get) => ({
  allTags: [],

  refreshTagsList: async () => {
    if (!window.electronAPI) return;
    try {
      if (window.electronAPI.getAllTags) {
        const tags = await window.electronAPI.getAllTags();
        set({ allTags: tags || [] });
      } else {
        const settings = get().settings;
        set({ allTags: settings?.tags || [] });
      }
    } catch (err) {
      console.error('Failed to refresh tags:', err);
    }
  },

  saveTagDefinition: async (tagDef: TagDefinition) => {
    if (!window.electronAPI) return;
    try {
      if (window.electronAPI.saveTagDefinition) {
        await window.electronAPI.saveTagDefinition(tagDef);
      } else {
        const settings = get().settings;
        const currentTags = [...(settings?.tags || [])];
        const idx = currentTags.findIndex((t) => t.name.toLowerCase() === tagDef.name.toLowerCase());
        if (idx >= 0) {
          currentTags[idx] = { ...currentTags[idx], ...tagDef };
        } else {
          currentTags.push(tagDef);
        }
        await get().updateSettings({ tags: currentTags });
      }
      await get().loadSettings();
      await get().refreshTagsList();
    } catch (err) {
      console.error('Failed to save tag definition:', err);
    }
  },

  renameTag: async (oldName: string, newName: string) => {
    if (!window.electronAPI) return 0;
    try {
      let count = 0;
      if (window.electronAPI.renameTag) {
        const res = await window.electronAPI.renameTag(oldName, newName);
        count = res?.updatedCount || 0;
      }
      await get().loadSettings();
      await get().refreshTagsList();
      await get().refreshTasksList();
      if (get().activeNote) {
        await get().loadNoteForDate(get().selectedDate);
      }
      return count;
    } catch (err) {
      console.error('Failed to rename tag:', err);
      return 0;
    }
  },

  deleteTag: async (tagName: string, removeFromTasks = true) => {
    if (!window.electronAPI) return 0;
    try {
      let count = 0;
      if (window.electronAPI.deleteTag) {
        const res = await window.electronAPI.deleteTag(tagName, removeFromTasks);
        count = res?.updatedCount || 0;
      }
      await get().loadSettings();
      await get().refreshTagsList();
      await get().refreshTasksList();
      if (get().activeNote) {
        await get().loadNoteForDate(get().selectedDate);
      }
      return count;
    } catch (err) {
      console.error('Failed to delete tag:', err);
      return 0;
    }
  },
});

