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
        activeDaysCount={12}
        completedTasksCount={6}
        totalTasksCount={10}
        completionPercent={60}
        heatmapDays={[]}
        weeklyProgress={[]}
        statusDistribution={{ completed: 6, completedPct: 60, inProgress: 2, inProgressPct: 20, pending: 2, pendingPct: 20, total: 10 }}
        completedTasks={[{ id: 'a', filename: 'a.md', filepath: '', title: 'Review release notes', status: 'done', created: '2026-02-01' }]}
        onOpenTask={onOpenTask}
        onViewTasks={onViewTasks}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6 of 10')).toBeInTheDocument();
    expect(screen.getByText('Daily activity')).toBeInTheDocument();
    expect(screen.queryByText(/sasentrywebcast|Postgresql/i)).not.toBeInTheDocument();
    expect(screen.getByText('No tasks recorded for this period.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Review release notes'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Review release notes' }));

    fireEvent.click(screen.getByRole('button', { name: /view all completed tasks/i }));
    expect(onViewTasks).toHaveBeenCalledOnce();
  });
});
