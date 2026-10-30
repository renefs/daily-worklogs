import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { TaskBoardSection } from '../../src/components/settings/sections/TaskBoardSection';
import { useAppStore } from '../../src/store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS } from '../../src/types';
import type { AppSettings, KanbanColumnConfig, TaskMeta } from '../../src/types';

const reviewColumn: KanbanColumnConfig = {
  id: 'review',
  title: 'Code review',
  color: 'grape',
  iconName: 'eye',
  visible: true,
  behavior: 'in_progress',
  isCustom: true,
};

function makeTask(id: string, status: string): TaskMeta {
  return {
    id,
    filename: `${id}.md`,
    filepath: `/vault/tasks/${id}.md`,
    title: `Task ${id}`,
    status,
    created: '2026-01-01',
  };
}

let diskTasks: TaskMeta[] = [];
let callOrder: string[] = [];

function baseSettings(columns: KanbanColumnConfig[]): AppSettings {
  return {
    vaultPath: '/mock/vault',
    language: 'en',
    themeColor: 'indigo',
    colorScheme: 'light',
    weekStartDay: 1,
    kanbanColumns: columns,
    autoSave: true,
    autoSaveDelay: 1000,
    editorFontSize: 15,
  };
}

function setUp(columns: KanbanColumnConfig[], tasks: TaskMeta[]) {
  diskTasks = tasks.map((task) => ({ ...task }));
  callOrder = [];
  useAppStore.setState({ settings: baseSettings(columns), tasks: diskTasks.map((task) => ({ ...task })) });

  window.electronAPI.listTasks = vi.fn(async () => diskTasks.map((task) => ({ ...task })));
  window.electronAPI.updateTaskStatus = vi.fn(async (filename: string, status: string) => {
    callOrder.push(`move:${filename}:${status}`);
    diskTasks = diskTasks.map((task) => (task.filename === filename ? { ...task, status } : task));
    return { success: true, task: diskTasks.find((task) => task.filename === filename)! } as never;
  });
  window.electronAPI.saveSettings = vi.fn(async (partial: Partial<AppSettings>) => {
    callOrder.push('saveSettings');
    return { ...useAppStore.getState().settings!, ...partial };
  });
}

describe('Task board column protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    useAppStore.setState({ settings: null, tasks: [] });
  });

  it('asks before deleting a column and shows how many tasks it holds', async () => {
    setUp([...DEFAULT_KANBAN_COLUMNS, reviewColumn], [makeTask('a', 'review'), makeTask('b', 'review'), makeTask('c', 'todo')]);
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete column Code review' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2 tasks use this column/)).toBeInTheDocument();
    expect(window.electronAPI.saveSettings).not.toHaveBeenCalled();
    expect(window.electronAPI.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('moves the tasks to the chosen column through the task update path before removing the column', async () => {
    setUp([...DEFAULT_KANBAN_COLUMNS, reviewColumn], [makeTask('a', 'review'), makeTask('b', 'review'), makeTask('c', 'todo')]);
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete column Code review' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move 2 tasks and delete' }));

    await waitFor(() => expect(window.electronAPI.saveSettings).toHaveBeenCalled());
    // Same behavior (in progress) is preselected, so the tasks land in "In progress".
    expect(callOrder).toEqual(['move:a.md:in_progress', 'move:b.md:in_progress', 'saveSettings']);
    const saved = vi.mocked(window.electronAPI.saveSettings).mock.calls[0][0];
    expect(saved.kanbanColumns?.some((col) => col.id === 'review')).toBe(false);
    expect(useAppStore.getState().tasks.filter((task) => task.status === 'in_progress')).toHaveLength(2);
  });

  it('keeps the column when a task cannot be moved', async () => {
    setUp([...DEFAULT_KANBAN_COLUMNS, reviewColumn], [makeTask('a', 'review')]);
    window.electronAPI.updateTaskStatus = vi.fn(async () => ({ success: false } as never));
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete column Code review' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move 1 task and delete' }));

    await waitFor(() => expect(window.electronAPI.updateTaskStatus).toHaveBeenCalled());
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Move 1 task and delete' })).not.toBeDisabled());
    expect(window.electronAPI.saveSettings).not.toHaveBeenCalled();
  });

  it('deletes an empty column after a plain confirmation', async () => {
    setUp([...DEFAULT_KANBAN_COLUMNS, reviewColumn], [makeTask('c', 'todo')]);
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete column Code review' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/tasks? use this column/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(window.electronAPI.saveSettings).toHaveBeenCalled());
    expect(window.electronAPI.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('protects tasks of custom columns when resetting to the defaults', async () => {
    setUp([...DEFAULT_KANBAN_COLUMNS, reviewColumn], [makeTask('a', 'review')]);
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/1 task in a custom column will move/)).toBeInTheDocument();
    expect(window.electronAPI.saveSettings).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset to Defaults' }));
    await waitFor(() => expect(window.electronAPI.saveSettings).toHaveBeenCalled());
    expect(callOrder).toEqual(['move:a.md:in_progress', 'saveSettings']);
    const saved = vi.mocked(window.electronAPI.saveSettings).mock.calls[0][0];
    expect(saved.kanbanColumns).toEqual(DEFAULT_KANBAN_COLUMNS);
  });

  it('warns before hiding a column that still has tasks', async () => {
    setUp(DEFAULT_KANBAN_COLUMNS, [makeTask('a', 'waiting')]);
    renderWithMantine(<TaskBoardSection />);

    fireEvent.click(screen.getByRole('switch', { name: 'Show or hide column Waiting' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/1 task is in "Waiting"/)).toBeInTheDocument();
    expect(window.electronAPI.saveSettings).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide column' }));
    await waitFor(() => expect(window.electronAPI.saveSettings).toHaveBeenCalled());
    const saved = vi.mocked(window.electronAPI.saveSettings).mock.calls[0][0];
    expect(saved.kanbanColumns?.find((col) => col.id === 'waiting')?.visible).toBe(false);
  });
});
