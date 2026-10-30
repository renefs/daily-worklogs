import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { NavigationRail } from '../../src/components/layout/NavigationRail';
import { useAppStore } from '../../src/store/useAppStore';

describe('NavigationRail', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: 'daily',
      isSidebarCollapsed: false,
    });
  });

  it('renders collapse button enabled when in daily view with expanded sidebar', () => {
    useAppStore.setState({ currentView: 'daily', isSidebarCollapsed: false });
    renderWithMantine(<NavigationRail />);

    const button = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders expand button enabled when in daily view with collapsed sidebar', () => {
    useAppStore.setState({ currentView: 'daily', isSidebarCollapsed: true });
    renderWithMantine(<NavigationRail />);

    const button = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders expand button visible but disabled when in reports view', () => {
    useAppStore.setState({ currentView: 'weekly', isSidebarCollapsed: false });
    renderWithMantine(<NavigationRail />);

    const button = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('renders expand button visible but disabled when in tasks view', () => {
    useAppStore.setState({ currentView: 'tasks', isSidebarCollapsed: false });
    renderWithMantine(<NavigationRail />);

    const button = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('marks the settings button as the current page while Settings is open', () => {
    useAppStore.setState({ currentView: 'settings' });
    renderWithMantine(<NavigationRail />);

    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens the Settings view from the settings button', async () => {
    useAppStore.setState({ currentView: 'tasks', settingsReturnView: 'daily' });
    renderWithMantine(<NavigationRail />);

    const button = screen.getByRole('button', { name: 'Open settings' });
    expect(button).not.toHaveAttribute('aria-current');
    fireEvent.click(button);

    await waitFor(() => expect(useAppStore.getState().currentView).toBe('settings'));
    expect(useAppStore.getState().settingsReturnView).toBe('tasks');
  });
});
