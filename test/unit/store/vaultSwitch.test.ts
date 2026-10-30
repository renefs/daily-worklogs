import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/store/useAppStore';
import { registerTaskEditorFlush } from '../../../src/services/editorSession';
import type { AppSettings, TaskMeta } from '../../../src/types';

const settings = (vaultPath: string): AppSettings => ({
  vaultPath,
  language: 'en',
  themeColor: 'indigo',
  colorScheme: 'light',
  weekStartDay: 1,
  autoSave: true,
  autoSaveDelay: 1000,
  editorFontSize: 15,
  areas: [],
  projects: [],
});

describe('vault switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentView: 'daily',
      selectedDate: '2026-09-07',
      settings: settings('/old/vault'),
      allTags: [{ name: 'old-tag' }],
      routineCompletionsByDate: { '2026-09-07': ['old-routine'] },
      isDirty: false,
      activeNote: null,
      activeTask: null,
      tasks: [],
    });
  });

  it('reloads settings, notes, tasks, tags and routine completions after choosing a vault', async () => {
    window.electronAPI.selectVaultDirectory = vi.fn().mockResolvedValue('/new/vault');
    window.electronAPI.getSettings = vi.fn().mockResolvedValue(settings('/new/vault'));
    window.electronAPI.getAllTags = vi.fn().mockResolvedValue([{ name: 'new-tag' }]);
    window.electronAPI.getRoutineCompletions = vi.fn().mockResolvedValue(['new-routine']);
    window.electronAPI.listNotes = vi.fn().mockResolvedValue([]);
    window.electronAPI.listTasks = vi.fn().mockResolvedValue([]);

    const selected = await useAppStore.getState().changeVault();

    expect(selected).toBe('/new/vault');
    const state = useAppStore.getState();
    expect(state.settings?.vaultPath).toBe('/new/vault');
    expect(state.allTags).toEqual([{ name: 'new-tag' }]);
    expect(state.routineCompletionsByDate['2026-09-07']).toEqual(['new-routine']);
    expect(window.electronAPI.listNotes).toHaveBeenCalled();
    expect(window.electronAPI.listTasks).toHaveBeenCalled();
    expect(window.electronAPI.readNote).toHaveBeenCalledWith('2026-09-07');
  });

  it('changes nothing when the folder dialog is cancelled', async () => {
    window.electronAPI.selectVaultDirectory = vi.fn().mockResolvedValue(null);
    window.electronAPI.getAllTags = vi.fn();

    expect(await useAppStore.getState().changeVault()).toBeNull();

    expect(window.electronAPI.getAllTags).not.toHaveBeenCalled();
    expect(useAppStore.getState().allTags).toEqual([{ name: 'old-tag' }]);
  });

  it('does not open the folder dialog when the open task cannot be saved', async () => {
    useAppStore.setState({ currentView: 'task' });
    window.electronAPI.selectVaultDirectory = vi.fn();
    const unregister = registerTaskEditorFlush(async () => false);

    try {
      expect(await useAppStore.getState().changeVault()).toBeNull();
      expect(window.electronAPI.selectVaultDirectory).not.toHaveBeenCalled();
    } finally {
      unregister();
    }
  });

  it('drops the open task of the previous vault', async () => {
    const task: TaskMeta = {
      id: 't',
      filename: 't.md',
      filepath: '/old/vault/tasks/t.md',
      title: 'T',
      status: 'todo',
      created: '2026-01-01',
    };
    useAppStore.setState({
      currentView: 'task',
      previousView: 'tasks',
      activeTask: { ...task, content: '' },
    });
    window.electronAPI.selectVaultDirectory = vi.fn().mockResolvedValue('/new/vault');
    window.electronAPI.getSettings = vi.fn().mockResolvedValue(settings('/new/vault'));
    window.electronAPI.getAllTags = vi.fn().mockResolvedValue([]);
    window.electronAPI.listTasks = vi.fn().mockResolvedValue([]);
    window.electronAPI.listNotes = vi.fn().mockResolvedValue([]);

    await useAppStore.getState().changeVault();

    expect(useAppStore.getState().activeTask).toBeNull();
    expect(useAppStore.getState().currentView).toBe('tasks');
  });
});

describe('areas without defaults', () => {
  it('keeps projects unassigned instead of moving them to a phantom area when the last area is deleted', async () => {
    useAppStore.setState({
      settings: settings('/mock/vault'),
      areas: [{ id: 'only', name: 'Only' }],
      projects: [{ id: 'p', name: 'Proj', areaName: 'Only' }],
    });
    window.electronAPI.saveSettings = vi.fn(async (partial: Partial<AppSettings>) => ({
      ...settings('/mock/vault'),
      ...partial,
    }));

    await useAppStore.getState().deleteArea('Only');

    const saved = vi.mocked(window.electronAPI.saveSettings).mock.calls[0][0];
    expect(saved.areas).toEqual([]);
    expect(saved.projects).toEqual([{ id: 'p', name: 'Proj', areaName: 'Only' }]);
    expect(useAppStore.getState().areas).toEqual([]);
  });
});
