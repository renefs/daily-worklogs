import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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
});
