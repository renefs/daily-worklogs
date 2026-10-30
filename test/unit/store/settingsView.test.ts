import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/store/useAppStore';
import { registerTaskEditorFlush } from '../../../src/services/editorSession';
import type { DailyNote, TaskItem } from '../../../src/types';

const task = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  taskId: 1,
  filename: 'task-1.md',
  filepath: '/vault/tasks/task-1.md',
  title: 'Original',
  status: 'todo',
  created: '2026-01-01',
  content: 'original body',
  ...overrides,
});

const note = (content: string): DailyNote => ({
  date: '2026-09-07',
  filename: '2026-09-07.md',
  filepath: '/vault/2026/2026-09-07.md',
  content,
  exists: true,
});

describe('Settings as a view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentView: 'daily',
      previousView: 'tasks',
      selectedDate: '2026-09-07',
      settingsActiveTab: 'general',
      settingsReturnView: 'daily',
      isRoutinesDrawerOpen: false,
      isDirty: false,
      activeNote: null,
      activeTask: null,
      isTaskDirty: false,
    });
  });

  it('closes the routines drawer in the same update that opens Settings', async () => {
    useAppStore.setState({ isRoutinesDrawerOpen: true });

    await useAppStore.getState().openSettings('routines');

    const state = useAppStore.getState();
    expect(state.currentView).toBe('settings');
    expect(state.isRoutinesDrawerOpen).toBe(false);
    expect(state.settingsActiveTab).toBe('routines');
  });

  it('only switches section, and closes the drawer, when Settings is already open', async () => {
    await useAppStore.getState().openSettings('general');
    useAppStore.setState({ isRoutinesDrawerOpen: true, settingsReturnView: 'weekly' });

    await useAppStore.getState().openSettings('routines');

    const state = useAppStore.getState();
    expect(state.currentView).toBe('settings');
    expect(state.settingsActiveTab).toBe('routines');
    expect(state.settingsReturnView).toBe('weekly');
    expect(state.isRoutinesDrawerOpen).toBe(false);
  });

  it('leaves view, section and return view untouched when a task draft cannot be saved', async () => {
    useAppStore.setState({ currentView: 'task', settingsActiveTab: 'tags', settingsReturnView: 'tasks', isRoutinesDrawerOpen: true });
    const unregister = registerTaskEditorFlush(async () => false);

    try {
      await useAppStore.getState().openSettings('routines');
    } finally {
      unregister();
    }

    const state = useAppStore.getState();
    expect(state.currentView).toBe('task');
    expect(state.settingsActiveTab).toBe('tags');
    expect(state.settingsReturnView).toBe('tasks');
    expect(state.isRoutinesDrawerOpen).toBe(true);
  });

  it('leaves everything untouched when the dirty note cannot be saved', async () => {
    const saveActiveNote = vi.fn().mockResolvedValue(false);
    useAppStore.setState({ isDirty: true, activeNote: note('unsaved'), saveActiveNote, settingsActiveTab: 'tags' });

    await useAppStore.getState().openSettings('routines');

    expect(saveActiveNote).toHaveBeenCalledWith({ force: true });
    expect(useAppStore.getState().currentView).toBe('daily');
    expect(useAppStore.getState().settingsActiveTab).toBe('tags');
  });

  it('saves a dirty note before opening Settings, and Back returns to the same day', async () => {
    const saveActiveNote = vi.fn().mockResolvedValue(true);
    useAppStore.setState({ isDirty: true, activeNote: note('unsaved'), saveActiveNote });

    await useAppStore.getState().openSettings();

    expect(saveActiveNote).toHaveBeenCalledWith({ force: true });
    expect(useAppStore.getState().currentView).toBe('settings');
    expect(useAppStore.getState().settingsReturnView).toBe('daily');

    await useAppStore.getState().closeSettings();
    expect(useAppStore.getState().currentView).toBe('daily');
    expect(useAppStore.getState().selectedDate).toBe('2026-09-07');
  });

  it('returns to the task editor with the saved copy of the task and keeps its own return view', async () => {
    const flush = vi.fn().mockResolvedValue(true);
    const unregister = registerTaskEditorFlush(flush);
    useAppStore.setState({ currentView: 'task', previousView: 'tasks', activeTask: task() });
    window.electronAPI.readTask = vi.fn().mockResolvedValue(task({ title: 'Saved title', content: 'saved body' }));

    try {
      await useAppStore.getState().openSettings('kanban');
      expect(flush).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().currentView).toBe('settings');
      expect(useAppStore.getState().settingsReturnView).toBe('task');
      // The task editor's own return target must survive the detour.
      expect(useAppStore.getState().previousView).toBe('tasks');
      expect(useAppStore.getState().activeTask?.title).toBe('Original');
    } finally {
      unregister();
    }

    await useAppStore.getState().closeSettings();

    const state = useAppStore.getState();
    expect(window.electronAPI.readTask).toHaveBeenCalledWith('task-1.md');
    expect(state.currentView).toBe('task');
    expect(state.activeTask?.title).toBe('Saved title');
    expect(state.activeTask?.content).toBe('saved body');

    state.closeTaskEditor();
    expect(useAppStore.getState().currentView).toBe('tasks');
  });

  it('falls back to the board when the task disappeared while in Settings', async () => {
    useAppStore.setState({ currentView: 'settings', settingsReturnView: 'task', previousView: 'tasks', activeTask: task() });
    window.electronAPI.readTask = vi.fn().mockRejectedValue(new Error('missing'));

    await useAppStore.getState().closeSettings();

    expect(useAppStore.getState().currentView).toBe('tasks');
    expect(useAppStore.getState().activeTask).toBeNull();
  });

  it('does nothing when closeSettings is called outside Settings', async () => {
    await useAppStore.getState().closeSettings();
    expect(useAppStore.getState().currentView).toBe('daily');
  });

  it('opening a task from Settings returns to the view Settings came from', async () => {
    useAppStore.setState({ currentView: 'settings', settingsReturnView: 'weekly' });

    await useAppStore.getState().openTaskEditor(task());
    expect(useAppStore.getState().currentView).toBe('task');
    expect(useAppStore.getState().previousView).toBe('weekly');
  });

  it('restores report period state when Back returns to a report', async () => {
    await useAppStore.getState().setCurrentView('monthly');
    await useAppStore.getState().openSettings();
    await useAppStore.getState().closeSettings();

    expect(useAppStore.getState().currentView).toBe('monthly');
    expect(useAppStore.getState().reportPeriod).toBe('month');
  });
});
