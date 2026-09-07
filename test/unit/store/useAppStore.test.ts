import { describe, it, expect, beforeEach } from 'vitest';
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
});

