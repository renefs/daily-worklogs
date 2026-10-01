import React from 'react';
import { Group, Stack, Text } from '@mantine/core';
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
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap={14}>
            <PeriodKpiCards
              calendarIconType="month"
              daysLoggedContent={
                <Group gap={4} align="baseline" mt={2}>
                  <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                    {activeDaysCount}
                  </Text>
                  <Text size="xs" c="dimmed">
                    of {daysInMonth} days
                  </Text>
                </Group>
              }
              tasksCompletedValue={`${completedTasksCount} of ${totalTasksCount}`}
              completionRatePercent={completionPercent}
            />

            <MonthlyActivityPanels
              isDark={isDark}
              heatmapDays={heatmapDays}
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
            <Text size="xs" c="dimmed" ta="center" py="xs" style={{ fontSize: 11 }}>
              {t('dashboard.autoUpdatedFooter', 'Data updates automatically with each daily log.')}
            </Text>
          </Stack>
  );
};
