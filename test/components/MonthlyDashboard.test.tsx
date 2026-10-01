import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { MonthlyDashboard } from '../../src/components/views/monthly/MonthlyDashboard';

describe('MonthlyDashboard', () => {
  it('renders the monthly metrics and delegates task actions', () => {
    const onOpenTask = vi.fn();
    const onViewTasks = vi.fn();

    renderWithMantine(
      <MonthlyDashboard
        isDark={false}
        daysInMonth={30}
        previousMonthLabel="Sep 2026"
        activeDaysCount={12}
        completedTasksCount={6}
        totalTasksCount={10}
        completionPercent={60}
        heatmapDays={[]}
        weeklyProgress={[]}
        statusDistribution={{ completed: 6, completedPct: 60, inProgress: 2, inProgressPct: 20, pending: 2, pendingPct: 20, total: 10 }}
        onOpenTask={onOpenTask}
        onViewTasks={onViewTasks}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6 of 10')).toBeInTheDocument();
    expect(screen.getByText('Daily activity')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change password of sasentrywebcast service account'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Change password of sasentrywebcast service account' }));

    fireEvent.click(screen.getByRole('button', { name: /view all completed tasks/i }));
    expect(onViewTasks).toHaveBeenCalledOnce();
  });
});
