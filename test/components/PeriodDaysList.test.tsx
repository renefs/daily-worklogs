import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { PeriodDaysList } from '../../src/components/views/PeriodDaysList';
import { useAppStore } from '../../src/store/useAppStore';
import type { PeriodSummary } from '../../src/types';

describe('PeriodDaysList Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      reportPeriod: 'week',
      reportDaysExpanded: false,
    });
  });

  const mockPeriodSummary: PeriodSummary = {
    period: 'week',
    startDate: '2026-08-17',
    endDate: '2026-08-23',
    totalDays: 7,
    activeDays: 2,
    totalTasks: 4,
    completedTasks: 3,
    completionPercentage: 75,
    topTags: [],
    days: [
      {
        date: '2026-08-18',
        exists: true,
        checkedCount: 2,
        uncheckedCount: 1,
        totalTasks: 3,
        headings: ["Today's Goals"],
        content: '# 2026-08-18\n- [x] Task 1\n- [x] Task 2\n- [ ] Task 3',
      },
      {
        date: '2026-08-19',
        exists: true,
        checkedCount: 1,
        uncheckedCount: 0,
        totalTasks: 1,
        headings: ["Today's Goals"],
        content: '# 2026-08-19\n- [x] Task 4',
      },
    ],
  };

  it('renders days list with note summaries', () => {
    renderWithMantine(<PeriodDaysList periodSummary={mockPeriodSummary} />);

    // Should render localized date titles for the active note days
    expect(screen.getByText(/August 18/i)).toBeInTheDocument();
    expect(screen.getByText(/August 19/i)).toBeInTheDocument();
  });

  it('renders empty state when no days are present', () => {
    const emptySummary: PeriodSummary = {
      period: 'week',
      startDate: '2026-08-17',
      endDate: '2026-08-23',
      totalDays: 7,
      activeDays: 0,
      totalTasks: 0,
      completedTasks: 0,
      completionPercentage: 0,
      topTags: [],
      days: [],
    };

    renderWithMantine(<PeriodDaysList periodSummary={emptySummary} />);
    expect(screen.queryByText(/August 18/i)).not.toBeInTheDocument();
  });

  it('persists expand all preference in store for week/month and defaults to expanded when remounted', async () => {
    const { unmount } = renderWithMantine(<PeriodDaysList periodSummary={mockPeriodSummary} />);

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    await waitFor(() => expect(useAppStore.getState().reportDaysExpanded).toBe(true));

    unmount();

    const nextWeekSummary: PeriodSummary = {
      ...mockPeriodSummary,
      startDate: '2026-08-24',
      endDate: '2026-08-30',
      days: [
        {
          date: '2026-08-25',
          exists: true,
          tasksTotal: 1,
          tasksCompleted: 1,
          content: '# 2026-08-25\n- [x] Next week task',
        },
      ],
    };

    renderWithMantine(<PeriodDaysList periodSummary={nextWeekSummary} />);
    expect(screen.getByText('Next week task')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(useAppStore.getState().reportDaysExpanded).toBe(false);
  });
});

