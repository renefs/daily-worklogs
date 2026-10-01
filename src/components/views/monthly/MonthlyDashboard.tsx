import React from 'react';
import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { PeriodKpiCards } from '../period/PeriodKpiCards';
import { MonthlyActivityPanels, type MonthlyHeatmapDay, type MonthlyStatusDistribution, type MonthlyWeeklyProgress } from './MonthlyActivityPanels';
import { MonthlyTaskLists } from './MonthlyTaskLists';

export type { MonthlyHeatmapDay, MonthlyStatusDistribution, MonthlyWeeklyProgress } from './MonthlyActivityPanels';

interface MonthlyDashboardProps {
  isDark: boolean;
  daysInMonth: number;
  activeDaysCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  completionPercent: number;
  heatmapDays: MonthlyHeatmapDay[];
  weeklyProgress: MonthlyWeeklyProgress[];
  statusDistribution: MonthlyStatusDistribution;
  completedTasks?: TaskMeta[];
  inProgressTasks?: TaskMeta[];
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onOpenWeek?: (date: string) => void;
}

export const MonthlyDashboard: React.FC<MonthlyDashboardProps> = ({
  isDark,
  daysInMonth,
  activeDaysCount,
  completedTasksCount,
  totalTasksCount,
  completionPercent,
  heatmapDays,
  weeklyProgress,
  statusDistribution,
  completedTasks,
  inProgressTasks,
  onOpenTask,
  onViewTasks,
  weekStartDay = 1,
  onOpenWeek,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
            <PeriodKpiCards
              calendarIconType="month"
              daysLoggedContent={String(activeDaysCount)}
              daysLoggedSubtitle={t('reports.ofCalendarDays', { count: daysInMonth })}
              tasksCompletedValue={`${completedTasksCount} ${t('reports.of')} ${totalTasksCount}`}
              tasksCompletedSubtitle={t('reports.tasksInPeriod')}
              completionRateSubtitle={t('reports.completedRatio')}
              completionRatePercent={completionPercent}
            />

            <MonthlyActivityPanels
              isDark={isDark}
              heatmapDays={heatmapDays}
              weekStartDay={weekStartDay}
              onOpenWeek={onOpenWeek}
              weeklyProgress={weeklyProgress}
              statusDistribution={statusDistribution}
            />

            <MonthlyTaskLists
              completedTasks={completedTasks}
              inProgressTasks={inProgressTasks}
              onOpenTask={onOpenTask}
              onViewTasks={onViewTasks}
            />
            {/* Footer notice */}
            <Text size="xs" c="dimmed" ta="center" py="xs">
              {t('dashboard.autoUpdatedFooter', 'Data updates automatically with each daily log.')}
            </Text>
          </Stack>
  );
};
