import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { YearlyDashboard, type YearlyMonthActivity } from '../../src/components/views/yearly/YearlyDashboard';

const monthlyActivity: YearlyMonthActivity[] = [{
  name: 'Jan',
  monthIndex: 0,
  count: 12,
  isCurrentMonth: false,
  isFutureMonth: false,
  heightPercent: 60,
}];

describe('YearlyDashboard', () => {
  it('renders the yearly metrics and delegates achievement actions', () => {
    const onOpenTask = vi.fn();
    const onViewAllAchievements = vi.fn();

    renderWithMantine(
      <YearlyDashboard
        year="2026"
        isDark={false}
        activeDaysCount={120}
        completedTasksCount={30}
        totalTasksCount={40}
        completionPercent={75}
        monthlyActivity={monthlyActivity}
        completedTasks={[{ id: 'a', filename: 'a.md', filepath: '', title: 'Finish the migration', status: 'done', created: '2026-01-02' }]}
        projectDistribution={[{ name: 'Platform', count: 2 }]}
        priorityDistribution={[{ key: 'high', count: 1 }]}
        onOpenTask={onOpenTask}
        onViewAllAchievements={onViewAllAchievements}
      />
    );

    expect(screen.getByText('120 of 365')).toBeInTheDocument();
    expect(screen.getByText('30 of 40')).toBeInTheDocument();
    expect(screen.getByText('Logging activity by month')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Finish the migration'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Finish the migration' }));
    expect(screen.getByText(/Platform:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view all achievements/i }));
    expect(onViewAllAchievements).toHaveBeenCalledOnce();
  });

  it('opens a month from the annual activity view', () => {
    const onOpenMonth = vi.fn();
    renderWithMantine(<YearlyDashboard year="2024" daysInYear={366} isDark={false} activeDaysCount={12} completedTasksCount={0}
      totalTasksCount={0} completionPercent={0} monthlyActivity={monthlyActivity} completedTasks={[]} projectDistribution={[]}
      priorityDistribution={[]} onOpenTask={vi.fn()} onViewAllAchievements={vi.fn()} onOpenMonth={onOpenMonth} />);
    expect(screen.getByText('12 of 366')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Jan 2024' }));
    expect(onOpenMonth).toHaveBeenCalledWith(0);
  });

  it('shows empty states instead of sample tasks or chart totals', () => {
    renderWithMantine(
      <YearlyDashboard
        year="2026"
        isDark={false}
        activeDaysCount={0}
        completedTasksCount={0}
        totalTasksCount={0}
        completionPercent={0}
        monthlyActivity={[]}
        completedTasks={[]}
        projectDistribution={[]}
        priorityDistribution={[]}
        onOpenTask={vi.fn()}
        onViewAllAchievements={vi.fn()}
      />
    );

    expect(screen.getByText('0 of 365')).toBeInTheDocument();
    expect(screen.getAllByText('No data')).toHaveLength(2);
    expect(screen.getByText('No tasks recorded for this period.')).toBeInTheDocument();
    expect(screen.queryByText(/sasentrywebcast|Postgresql|46/)).not.toBeInTheDocument();
  });
});
