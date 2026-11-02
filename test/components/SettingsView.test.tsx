import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { SettingsView } from '../../src/components/views/SettingsView';
import { useAppStore } from '../../src/store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS } from '../../src/types';
import type { AppSettings } from '../../src/types';

const settings: AppSettings = {
  vaultPath: '/mock/vault',
  language: 'en',
  themeColor: 'indigo',
  colorScheme: 'light',
  weekStartDay: 1,
  kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  autoSave: true,
  autoSaveDelay: 1000,
  editorFontSize: 15,
  enableDailyRoutines: true,
  routines: [],
};

function pressEscape(target: Element = document.body, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(target, { key: 'Escape', code: 'Escape', ...init });
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentView: 'settings',
      settingsReturnView: 'tasks',
      settingsActiveTab: 'general',
      settings,
      areas: [{ id: 'work', name: 'Work' }],
      projects: [],
      tasks: [],
      allTags: [],
    });
  });

  it('shows the requested section and switches sections from the navigation', () => {
    useAppStore.setState({ settingsActiveTab: 'editor' });
    renderWithMantine(<SettingsView />);

    expect(screen.getByRole('heading', { level: 2, name: 'Editor' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(useAppStore.getState().settingsActiveTab).toBe('appearance');
  });

  it('labels the back control with the view it returns to and uses it', async () => {
    renderWithMantine(<SettingsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Tasks' }));

    await waitFor(() => expect(useAppStore.getState().currentView).toBe('tasks'));
  });

  it('does not render a Close button', () => {
    renderWithMantine(<SettingsView />);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('stays on Settings when Escape is pressed', () => {
    renderWithMantine(<SettingsView />);

    pressEscape();

    expect(useAppStore.getState().currentView).toBe('settings');
  });

  it('keeps Settings open when Escape closes a nested editor modal', async () => {
    useAppStore.setState({ settingsActiveTab: 'areas' });
    renderWithMantine(<SettingsView />);

    fireEvent.click(screen.getByRole('button', { name: 'New Area' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    pressEscape(dialog);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useAppStore.getState().currentView).toBe('settings');
  });

  it('keeps Settings open when Escape closes a select dropdown', async () => {
    renderWithMantine(<SettingsView />);

    const language = screen.getByRole('textbox', { name: /Language/ });
    fireEvent.click(language);
    await screen.findByRole('listbox');

    pressEscape(language);

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(useAppStore.getState().currentView).toBe('settings');
  });
});
