import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '../src/i18n';

// Automatically clean up DOM after each test
afterEach(() => {
  cleanup();
});

// Polyfill window.matchMedia for Mantine UI
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Polyfill ResizeObserver for Mantine scrollables and popovers
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.ResizeObserver = MockResizeObserver as any;

  // Mock window.electronAPI for renderer component testing
  (window as any).electronAPI = {
    platform: 'darwin',
    getSettings: vi.fn().mockResolvedValue({
      vaultPath: '/mock/vault',
      theme: 'auto',
      accentColor: 'indigo',
      language: 'en',
      firstDayOfWeek: 1,
      defaultTemplate: 'standard',
      templates: [],
      kanbanColumns: [
        { id: 'todo', title: 'To Do' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
      ],
      areas: [],
      projects: [],
      tags: [],
      dailyRoutines: [],
    }),
    saveSettings: vi.fn().mockResolvedValue({}),
    getRoutineCompletions: vi.fn().mockResolvedValue([]),
    updateRoutineCompletions: vi.fn().mockResolvedValue([]),
    selectVaultDirectory: vi.fn().mockResolvedValue('/mock/vault'),
    getAppVersion: vi.fn().mockResolvedValue('1.11.0'),
    getAppInfo: vi.fn().mockResolvedValue({ name: 'Daily Worklog', version: '1.11.0' }),
    getMemoryMetrics: vi.fn().mockResolvedValue({ totalWorkingSetBytes: 0, processes: [] }),
    showAboutDialog: vi.fn().mockResolvedValue({ success: true }),
    readNote: vi.fn().mockResolvedValue({ content: '', exists: false, isDirectory: false }),
    writeNote: vi.fn().mockResolvedValue({ success: true }),
    deleteNote: vi.fn().mockResolvedValue({ success: true }),
    listNotes: vi.fn().mockResolvedValue([]),
    getNotesRange: vi.fn().mockResolvedValue([]),
    listTasks: vi.fn().mockResolvedValue([]),
    searchTaskContents: vi.fn().mockResolvedValue([]),
    readTask: vi.fn().mockResolvedValue({ content: '', metadata: {} }),
    writeTask: vi.fn().mockResolvedValue({ success: true }),
    updateTaskStatus: vi.fn().mockResolvedValue({ success: true }),
    deleteTask: vi.fn().mockResolvedValue({ success: true }),
    renameTag: vi.fn().mockResolvedValue({ success: true, count: 0 }),
    deleteTag: vi.fn().mockResolvedValue({ success: true, count: 0 }),
    saveTagDefinition: vi.fn().mockResolvedValue({ success: true }),
    getAllTags: vi.fn().mockResolvedValue([]),
    renameArea: vi.fn().mockResolvedValue({ success: true, updatedTasksCount: 0, updatedNotesCount: 0 }),
    renameProject: vi.fn().mockResolvedValue({ success: true, updatedTasksCount: 0, updatedNotesCount: 0 }),
    exportDocument: vi.fn().mockResolvedValue({ success: true }),
    openInFileManager: vi.fn().mockResolvedValue({ success: true }),
    openExternalUrl: vi.fn().mockResolvedValue({ success: true }),
    logTaskToDailyNote: vi.fn().mockResolvedValue({ success: true }),
    saveImage: vi.fn().mockResolvedValue({ success: true, relativePath: 'images/test.png' }),
    selectImageDialog: vi.fn().mockResolvedValue(null),
    openVaultConfig: vi.fn().mockResolvedValue({ success: true }),
    readVaultConfigData: vi.fn().mockResolvedValue(null),
    watchVault: vi.fn().mockResolvedValue({ success: true }),
    onVaultChanged: vi.fn().mockReturnValue(() => {}),
  };
}

