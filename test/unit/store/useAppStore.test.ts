import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../../src/store/useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to predictable initial state
    useAppStore.setState({
      currentView: 'daily',
      selectedDate: '2026-09-07',
      isSettingsOpen: false,
      settingsActiveTab: 'general',
      isTaskModalOpen: false,
      isSidebarCollapsed: false,
      tasks: [],
      activeTask: null,
      activeNote: null,
      isSaving: false,
      isDirty: false,
      noteSaveError: null,
    });
  });

  it('updates current view and preserves previous view when switching to task editor', async () => {
    const store = useAppStore.getState();
    expect(store.currentView).toBe('daily');

    store.setCurrentView('kanban');
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

  it('sets selected date', () => {
    useAppStore.getState().setSelectedDate('2026-10-01');
    expect(useAppStore.getState().selectedDate).toBe('2026-10-01');
  });

  it('opens and closes settings modal with active tab', () => {
    const store = useAppStore.getState();
    store.openSettings('areas');
    expect(useAppStore.getState().isSettingsOpen).toBe(true);
    expect(useAppStore.getState().settingsActiveTab).toBe('areas');

    useAppStore.getState().setIsSettingsOpen(false);
    expect(useAppStore.getState().isSettingsOpen).toBe(false);
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
});
