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
        completedTasks={[{ id: 'a', filename: 'a.md', filepath: '', title: 'Review release notes', status: 'done', created: '2026-02-01' }]}
        onOpenTask={onOpenTask}
        onViewTasks={onViewTasks}
      />
    );

    expect(screen.getByText('4 of 7')).toBeInTheDocument();
    expect(screen.getByText('5 of 8')).toBeInTheDocument();
    expect(screen.getByText('Weekly activity')).toBeInTheDocument();
    expect(screen.queryByText(/sasentrywebcast|Postgresql/i)).not.toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Review release notes'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Review release notes' }));

    fireEvent.click(screen.getByRole('button', { name: /view all completed tasks/i }));
    expect(onViewTasks).toHaveBeenCalledOnce();
  });
});
