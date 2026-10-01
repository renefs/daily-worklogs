import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { WeeklyDashboard } from '../../src/components/views/weekly/WeeklyDashboard';

describe('WeeklyDashboard', () => {
  it('renders weekly metrics and delegates task actions', () => {
    const onOpenTask = vi.fn();
    const onViewTasks = vi.fn();

    renderWithMantine(
      <WeeklyDashboard
        isDark={false}
        weekDays={[]}
        activeDaysCount={4}
        completedTasksCount={5}
        totalTasksCount={8}
        completionPercent={63}
        projectBreakdown={[]}
        onOpenTask={onOpenTask}
        onViewTasks={onViewTasks}
      />
    );

    expect(screen.getByText('4 of 7')).toBeInTheDocument();
    expect(screen.getByText('5 of 8')).toBeInTheDocument();
    expect(screen.getByText('Weekly activity')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change password of sasentrywebcast service account'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Change password of sasentrywebcast service account' }));

    fireEvent.click(screen.getByRole('button', { name: /view all completed tasks/i }));
    expect(onViewTasks).toHaveBeenCalledOnce();
  });
});
