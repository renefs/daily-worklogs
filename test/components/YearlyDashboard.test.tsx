import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { YearlyDashboard, type YearlyMonthActivity } from '../../src/components/views/yearly/YearlyDashboard';

const monthlyActivity: YearlyMonthActivity[] = [{
  name: 'Jan',
  monthIndex: 0,
  count: 12,
  prevYearCount: 6,
  isCurrentMonth: false,
  isFutureMonth: false,
  heightPercent: 60,
  prevHeightPercent: 30,
}];

describe('YearlyDashboard', () => {
  it('renders the yearly metrics and delegates achievement actions', () => {
    const onOpenTask = vi.fn();
    const onViewAllAchievements = vi.fn();

    renderWithMantine(
      <YearlyDashboard
        year="2026"
        previousYear={2025}
        isDark={false}
        activeDaysCount={120}
        completedTasksCount={30}
        totalTasksCount={40}
        completionPercent={75}
        monthlyActivity={monthlyActivity}
        onOpenTask={onOpenTask}
        onViewAllAchievements={onViewAllAchievements}
      />
    );

    expect(screen.getByText('120 of 365')).toBeInTheDocument();
    expect(screen.getByText('30 of 40')).toBeInTheDocument();
    expect(screen.getByText('Logging activity by month')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change password of sasentrywebcast service account'));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Change password of sasentrywebcast service account' }));

    fireEvent.click(screen.getByRole('button', { name: /view all achievements/i }));
    expect(onViewAllAchievements).toHaveBeenCalledOnce();
  });
});
