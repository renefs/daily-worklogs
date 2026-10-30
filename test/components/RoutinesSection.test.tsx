import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { RoutinesSection } from '../../src/components/settings/sections/RoutinesSection';
import { useAppStore } from '../../src/store/useAppStore';
import type { AppSettings } from '../../src/types';

function setSettings(overrides: Partial<AppSettings>) {
  useAppStore.setState({
    settings: {
      vaultPath: '/mock/vault',
      language: 'en',
      themeColor: 'indigo',
      colorScheme: 'light',
      weekStartDay: 1,
      autoSave: true,
      autoSaveDelay: 1000,
      editorFontSize: 15,
      routines: [{ id: 'r1', title: 'Standup', schedule: 'weekdays', enabled: true }],
      ...overrides,
    },
  });
}

describe('RoutinesSection when the feature is turned off', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables adding and editing, including the empty-state button', () => {
    setSettings({ enableDailyRoutines: false, routines: [] });
    renderWithMantine(<RoutinesSection />);

    for (const button of screen.getAllByRole('button', { name: 'Add Routine' })) {
      expect(button).toBeDisabled();
    }
  });

  it('disables every row control but keeps the list visible', () => {
    setSettings({ enableDailyRoutines: false });
    renderWithMantine(<RoutinesSection />);

    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit routine Standup' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete routine Standup' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Enable or disable routine Standup' })).toBeDisabled();
  });

  it('keeps the controls active when the feature is on', () => {
    setSettings({ enableDailyRoutines: true });
    renderWithMantine(<RoutinesSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit routine Standup' }));
    expect(screen.getByDisplayValue('Standup')).toBeInTheDocument();
  });
});
