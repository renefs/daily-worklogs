import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../../src/store/useAppStore';
import { registerTaskEditorFlush } from '../../../src/services/editorSession';

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to predictable initial state
    useAppStore.setState({
      currentView: 'daily',
      selectedDate: '2026-09-07',
      settingsActiveTab: 'general',
      settingsReturnView: 'daily',
      isRoutinesDrawerOpen: false,
      isTaskModalOpen: false,
      isSidebarCollapsed: false,
      tasks: [],
      activeTask: null,
      activeNote: null,
      isSaving: false,
      isDirty: false,
      noteSaveError: null,
      externalNoteConflict: null,
    });
  });

  it('updates current view and preserves previous view when switching to task editor', async () => {
    const store = useAppStore.getState();
    expect(store.currentView).toBe('daily');

    await store.setCurrentView('kanban');
    expect(useAppStore.getState().currentView).toBe('kanban');

    await store.openTaskEditor({
      id: 'task-1',
      taskId: 1,
      filename: 'task-1.md',
      title: 'Active Task',
      status: 'todo',
      content: 'Hello',
    });

    expect(useAppStore.getState().currentView).toBe('task');
    expect(useAppStore.getState().previousView).toBe('kanban');
    expect(useAppStore.getState().activeTask?.title).toBe('Active Task');

    useAppStore.getState().closeTaskEditor();
    expect(useAppStore.getState().currentView).toBe('kanban');
    expect(useAppStore.getState().activeTask).toBeNull();
  });

  it('flushes active task editor and switches directly to subtask full view without modal', async () => {
    const store = useAppStore.getState();
    await store.setCurrentView('tasks');

    await store.openTaskEditor({
      id: 'task-1',
      taskId: 1,
      filename: 'task-1.md',
      title: 'Parent Task',
      status: 'todo',
      content: '- [ ] [[#2|Subtask]]',
    });

    const flushSpy = vi.fn().mockResolvedValue(true);
    const unregister = registerTaskEditorFlush(flushSpy);

    try {
      await useAppStore.getState().openTaskEditor({
        id: 'task-2',
        taskId: 2,
        filename: 'task-2.md',
        title: 'Subtask',
        status: 'todo',
        parent: 1,
        content: 'Subtask details',
      });

      expect(flushSpy).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().currentView).toBe('task');
      expect(useAppStore.getState().isTaskModalOpen).toBe(false);
      expect(useAppStore.getState().previousView).toBe('tasks');
      expect(useAppStore.getState().activeTask?.taskId).toBe(2);
      expect(useAppStore.getState().activeTask?.parent).toBe(1);
    } finally {
      unregister();
    }
  });

  it('sets selected date', async () => {
    await useAppStore.getState().setSelectedDate('2026-10-01');
    expect(useAppStore.getState().selectedDate).toBe('2026-10-01');
  });

  it('opens the settings view on the requested section and returns to the previous view', async () => {
    await useAppStore.getState().setCurrentView('tasks');

    await useAppStore.getState().openSettings('areas');
    expect(useAppStore.getState().currentView).toBe('settings');
    expect(useAppStore.getState().settingsActiveTab).toBe('areas');
    expect(useAppStore.getState().settingsReturnView).toBe('tasks');

    await useAppStore.getState().closeSettings();
    expect(useAppStore.getState().currentView).toBe('tasks');
  });

  it('remembers the last settings section when none is requested', async () => {
    await useAppStore.getState().openSettings('tags');
    await useAppStore.getState().closeSettings();

    await useAppStore.getState().openSettings();
    expect(useAppStore.getState().settingsActiveTab).toBe('tags');
  });

  it('toggles task modal open and closed with specified initial status', async () => {
    await useAppStore.getState().openTaskModal(null, 'in-progress');
    expect(useAppStore.getState().isTaskModalOpen).toBe(true);
    expect(useAppStore.getState().taskModalInitialStatus).toBe('in-progress');

    useAppStore.getState().closeTaskModal();
    expect(useAppStore.getState().isTaskModalOpen).toBe(false);
  });

  it('toggles sidebar collapsed state', () => {
    expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    useAppStore.getState().toggleSidebarCollapse();
    expect(useAppStore.getState().isSidebarCollapsed).toBe(true);
    useAppStore.getState().toggleSidebarCollapse();
    expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
  });

  it('clears the dirty state after saving a note successfully', async () => {
    vi.mocked(window.electronAPI.writeNote).mockResolvedValueOnce({
      success: true,
      filepath: '/mock/vault/2026/2026-09-07.md',
      lastModified: '2026-09-07T12:00:00.000Z',
    });
    useAppStore.setState({
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '',
        content: 'Saved content',
        exists: false,
      },
      isDirty: true,
      noteSaveError: 'Previous error',
    });

    await useAppStore.getState().saveActiveNote();

    expect(useAppStore.getState().isDirty).toBe(false);
    expect(useAppStore.getState().isSaving).toBe(false);
    expect(useAppStore.getState().noteSaveError).toBeNull();
    expect(useAppStore.getState().activeNote?.exists).toBe(true);
  });

  it('keeps note changes dirty and exposes an error when saving fails', async () => {
    vi.mocked(window.electronAPI.writeNote).mockRejectedValueOnce(new Error('Disk unavailable'));
    useAppStore.setState({
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '',
        content: 'Unsaved content',
        exists: false,
      },
      isDirty: true,
    });

    await useAppStore.getState().saveActiveNote();

    expect(useAppStore.getState().isDirty).toBe(true);
    expect(useAppStore.getState().isSaving).toBe(false);
    expect(useAppStore.getState().noteSaveError).toBe('Disk unavailable');
  });

  it('does not leave the current date when its dirty note cannot be saved', async () => {
    vi.mocked(window.electronAPI.writeNote).mockRejectedValueOnce(new Error('Disk unavailable'));
    useAppStore.setState({
      selectedDate: '2026-09-07',
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '',
        content: 'Keep this draft',
        exists: true,
      },
      isDirty: true,
    });

    await useAppStore.getState().setSelectedDate('2026-09-08');

    expect(useAppStore.getState().selectedDate).toBe('2026-09-07');
    expect(useAppStore.getState().activeNote?.content).toBe('Keep this draft');
    expect(window.electronAPI.readNote).not.toHaveBeenCalled();
  });

  it('flushes edits made during an in-flight save before changing dates', async () => {
    let resolveFirstWrite: ((value: { success: boolean; filepath: string; lastModified: string }) => void) | undefined;
    vi.mocked(window.electronAPI.writeNote)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstWrite = resolve; }))
      .mockResolvedValueOnce({ success: true, filepath: '/mock/vault/2026/2026-09-07.md', lastModified: 'later' });
    vi.mocked(window.electronAPI.readNote).mockResolvedValueOnce({
      date: '2026-09-08',
      filename: '2026-09-08.md',
      filepath: '',
      content: 'Next day',
      exists: false,
    });
    useAppStore.setState({
      selectedDate: '2026-09-07',
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '',
        content: 'First revision',
        exists: true,
      },
      isDirty: true,
    });

    const firstSave = useAppStore.getState().saveActiveNote();
    useAppStore.getState().setNoteContent('Newest revision');
    const navigation = useAppStore.getState().setSelectedDate('2026-09-08');
    resolveFirstWrite?.({ success: true, filepath: '/mock/vault/2026/2026-09-07.md', lastModified: 'first' });
    await Promise.all([firstSave, navigation]);

    expect(window.electronAPI.writeNote).toHaveBeenNthCalledWith(1, '2026-09-07', 'First revision');
    expect(window.electronAPI.writeNote).toHaveBeenNthCalledWith(2, '2026-09-07', 'Newest revision');
    expect(useAppStore.getState().selectedDate).toBe('2026-09-08');
  });

  it('ignores repeated watcher events for the last saved note revision while typing', () => {
    useAppStore.setState({
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '/mock/vault/2026/2026-09-07.md',
        content: 'New unsaved text',
        exists: true,
        lastModified: '2026-09-07T12:00:00.000Z',
      },
      isDirty: true,
    });

    useAppStore.getState().handleExternalNoteChange({
      date: '2026-09-07',
      content: 'Last saved text',
      exists: true,
      lastModified: '2026-09-07T12:00:00.000Z',
    });

    expect(useAppStore.getState().externalNoteConflict).toBeNull();
    expect(useAppStore.getState().activeNote?.content).toBe('New unsaved text');
    expect(useAppStore.getState().isDirty).toBe(true);
  });

  it('still reports a genuinely newer external revision while typing', () => {
    useAppStore.setState({
      activeNote: {
        date: '2026-09-07',
        filename: '2026-09-07.md',
        filepath: '/mock/vault/2026/2026-09-07.md',
        content: 'New unsaved text',
        exists: true,
        lastModified: '2026-09-07T12:00:00.000Z',
      },
      isDirty: true,
    });

    useAppStore.getState().handleExternalNoteChange({
      date: '2026-09-07',
      content: 'Changed in another editor',
      exists: true,
      lastModified: '2026-09-07T12:01:00.000Z',
    });

    expect(useAppStore.getState().externalNoteConflict?.content).toBe('Changed in another editor');
    expect(useAppStore.getState().activeNote?.content).toBe('New unsaved text');
  });

  it('toggles routines drawer open and closed', () => {
    expect(useAppStore.getState().isRoutinesDrawerOpen).toBe(false);

    useAppStore.getState().toggleRoutinesDrawer();
    expect(useAppStore.getState().isRoutinesDrawerOpen).toBe(true);

    useAppStore.getState().toggleRoutinesDrawer();
    expect(useAppStore.getState().isRoutinesDrawerOpen).toBe(false);

    useAppStore.getState().toggleRoutinesDrawer(true);
    expect(useAppStore.getState().isRoutinesDrawerOpen).toBe(true);

    useAppStore.getState().toggleRoutinesDrawer(false);
    expect(useAppStore.getState().isRoutinesDrawerOpen).toBe(false);
  });

  it('allows disabling and enabling daily routines via settings', async () => {
    useAppStore.setState({
      settings: {
        vaultPath: '/mock/vault',
        language: 'en',
        themeColor: 'blue',
        colorScheme: 'auto',
        weekStartDay: 1,
        autoSave: true,
        autoSaveDelay: 1000,
        editorFontSize: 15,
        enableDailyRoutines: true,
      },
    });

    expect(useAppStore.getState().settings?.enableDailyRoutines).toBe(true);

    await useAppStore.getState().updateSettings({ enableDailyRoutines: false });
    expect(useAppStore.getState().settings?.enableDailyRoutines).toBe(false);

    await useAppStore.getState().updateSettings({ enableDailyRoutines: true });
    expect(useAppStore.getState().settings?.enableDailyRoutines).toBe(true);
  });
});
