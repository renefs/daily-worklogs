import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { PeriodTasksBreakdown } from '../../src/components/views/PeriodTasksBreakdown';
import type { PeriodSummary } from '../../src/types';

describe('PeriodTasksBreakdown Component', () => {
  const mockSummary: PeriodSummary = {
    period: 'week',
    startDate: '2026-08-17',
    endDate: '2026-08-23',
    totalDays: 7,
    activeDays: 2,
    totalTasks: 2,
    completedTasks: 1,
    completionPercentage: 50,
    periodTaskCount: 2,
    topTags: [{ tag: 'urgent', count: 2 }],
    days: [],
    completedTasksList: [
      {
        id: 'task-1',
        taskId: 101,
        filename: 'task-1.md',
        title: 'Deploy Production Cluster',
        status: 'done',
        priority: 'high',
        area: 'Infrastructure',
        content: 'Task content',
      },
    ],
    inProgressTasksList: [
      {
        id: 'task-2',
        taskId: 102,
        filename: 'task-2.md',
        title: 'Review Security Alerts',
        status: 'in-progress',
        priority: 'medium',
        area: 'Infrastructure',
        content: 'Alerts content',
      },
    ],
  };

  it('renders period tasks grouped by status and displays task details', () => {
    const handleOpenTask = vi.fn();
    renderWithMantine(
      <PeriodTasksBreakdown
        periodSummary={mockSummary}
        onOpenTask={handleOpenTask}
      />
    );

    // Verify task titles appear in the breakdown
    expect(screen.getByText('Deploy Production Cluster')).toBeInTheDocument();
    expect(screen.getByText('Review Security Alerts')).toBeInTheDocument();

    // Verify task IDs appear
    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('#102')).toBeInTheDocument();
  });
});

