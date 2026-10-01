import React from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { PeriodKpiCards } from '../period/PeriodKpiCards';
import { MonthlyActivityPanels, type MonthlyHeatmapDay, type MonthlyStatusDistribution, type MonthlyWeeklyProgress } from './MonthlyActivityPanels';
import { MonthlyTaskLists } from './MonthlyTaskLists';

export type { MonthlyHeatmapDay, MonthlyStatusDistribution, MonthlyWeeklyProgress } from './MonthlyActivityPanels';

interface MonthlyDashboardProps {
  isDark: boolean;
  daysInMonth: number;
  previousMonthLabel: string;
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
  previousMonthLabel,
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
              daysLoggedDelta={
                <>
                  vs {previousMonthLabel} <span style={{ fontWeight: 700 }}>+1 day</span>
                </>
              }
              tasksCompletedValue={`${completedTasksCount} of ${totalTasksCount}`}
              tasksCompletedDelta={
                <>
                  vs {previousMonthLabel} <span style={{ fontWeight: 700 }}>+2</span>
                </>
              }
              completionRatePercent={completionPercent}
              completionRateDelta={
                <>
                  vs {previousMonthLabel} <span style={{ fontWeight: 700 }}>+40 pp</span>
                </>
              }
            />

            {/* Slim Informational Banner replacing 4th card */}
            <Paper
              px="md"
              py="xs"
              radius="md"
              withBorder
              style={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              }}
            >
              <Group gap={8} wrap="nowrap" align="center">
                <IconInfoCircle size={16} color="var(--mantine-primary-color-filled)" style={{ flexShrink: 0 }} />
                <Text size="xs" style={{ fontSize: 12, color: 'var(--app-text-primary)' }}>
                  {t('dashboard.monthJustStartedBanner', 'The month has just begun — more data will appear as you log your work.')}
                </Text>
              </Group>
            </Paper>

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
