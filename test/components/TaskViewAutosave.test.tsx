import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskView } from '../../src/components/views/TaskView';
import { useAppStore } from '../../src/store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS } from '../../src/types';
import { DEFAULT_AREAS } from '../../src/utils/areaProjectUtils';
import { renderWithMantine } from '../utils/test-utils';

describe('TaskView autosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentView: 'task',
      activeTask: null,
      taskModalInitialStatus: 'todo',
      taskEditorLayoutMode: 'live',
      isTaskPropertiesPanelOpen: false,
      settings: {
        vaultPath: '/mock/vault',
        language: 'en',
        themeColor: 'blue',
        colorScheme: 'light',
        weekStartDay: 1,
        defaultTemplateId: 'standard',
        templates: [],
        kanbanColumns: DEFAULT_KANBAN_COLUMNS,
        autoSave: true,
        autoSaveDelay: 10,
        dateFormat: 'YYYY-MM-DD',
        editorFontSize: 15,
        hasCompletedOnboarding: true,
        areas: DEFAULT_AREAS,
        projects: [],
      },
      areas: DEFAULT_AREAS,
      projects: [],
      allTags: [],
    });
  });

  it('reuses the first persisted filename for later autosaves', async () => {
    vi.mocked(window.electronAPI.writeTask).mockResolvedValue({
      success: true,
      task: {
        id: '1',
        taskId: 1,
        filename: '2026-09-08-new-task.md',
        filepath: '/mock/vault/tasks/2026-09-08-new-task.md',
        title: 'New task',
        status: 'todo',
        content: '',
      },
    });

    renderWithMantine(<TaskView />);
    const title = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(title, { target: { value: 'New task' } });

    await waitFor(() => expect(window.electronAPI.writeTask).toHaveBeenCalledTimes(1));
    fireEvent.change(title, { target: { value: 'New task updated' } });
    await waitFor(() => expect(window.electronAPI.writeTask).toHaveBeenCalledTimes(2));

    expect(vi.mocked(window.electronAPI.writeTask).mock.calls[1][0]).toMatchObject({
      filename: '2026-09-08-new-task.md',
      taskId: 1,
    });
  });

  it('renders the Live view mode option alongside Split, Code, and Preview in TaskHeader', () => {
    renderWithMantine(<TaskView />);

    expect(screen.getByRole('radio', { name: /Live/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Split/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Code/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Preview/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Split/i }));
    expect(useAppStore.getState().taskEditorLayoutMode).toBe('split');

    fireEvent.click(screen.getByRole('radio', { name: /Live/i }));
    expect(useAppStore.getState().taskEditorLayoutMode).toBe('live');
  });
});
