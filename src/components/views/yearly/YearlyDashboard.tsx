import React from 'react';
import { Group, Paper, Progress, RingProgress, SimpleGrid, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCalendarStats, IconCheck, IconChevronRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';

export interface YearlyMonthActivity {
  name: string;
  monthIndex: number;
  count: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  heightPercent: number;
}

export interface YearlyDistributionItem {
  name: string;
  count: number;
}

export interface YearlyPriorityItem {
  key: string;
  count: number;
}

interface YearlyDashboardProps {
  year: string;
  isDark: boolean;
  activeDaysCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  completionPercent: number;
  monthlyActivity: YearlyMonthActivity[];
  completedTasks: TaskMeta[];
  projectDistribution: YearlyDistributionItem[];
  priorityDistribution: YearlyPriorityItem[];
  onOpenTask: (task: TaskMeta) => void;
  onViewAllAchievements: () => void;
}

export const YearlyDashboard: React.FC<YearlyDashboardProps> = ({
  year,
  isDark,
  activeDaysCount,
  completedTasksCount,
  totalTasksCount,
  completionPercent,
  monthlyActivity,
  completedTasks,
  projectDistribution,
  priorityDistribution,
  onOpenTask,
  onViewAllAchievements,
}) => {
  const { t } = useTranslation();
  const cardStyle = { backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' };
  const projectTotal = projectDistribution.reduce((total, item) => total + item.count, 0);
  const taskTotal = priorityDistribution.reduce((total, item) => total + item.count, 0);
  const activityScale = Math.max(1, ...monthlyActivity.map((month) => month.count));

  const metrics = [
    { label: t('dashboard.daysLogged', 'Days logged'), value: `${activeDaysCount} of 365`, color: 'blue' },
    { label: t('dashboard.tasksCompleted', 'Tasks completed'), value: `${completedTasksCount} of ${totalTasksCount}`, color: 'teal' },
    { label: t('dashboard.completionRate', 'Completion rate'), value: `${completionPercent}%`, color: 'primary' },
  ];

  return (
    <Stack gap={14}>
      <SimpleGrid cols={{ base: 1, sm: 3, md: 3 }} spacing="md">
        {metrics.map((metric, index) => (
          <Paper key={metric.label} p="md" radius="md" withBorder style={cardStyle}>
            <Group gap="md" align="flex-start" wrap="nowrap">
              {index === 2 ? (
                <RingProgress size={48} roundCaps thickness={4} sections={[{ value: completionPercent, color: 'primary' }]} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <ThemeIconWrapper color={metric.color}>
                  {index === 0 ? <IconCalendarStats size={20} /> : <IconCheck size={20} />}
                </ThemeIconWrapper>
              )}
              <div style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>{metric.label}</Text>
                <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>{metric.value}</Text>
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>{t('dashboard.loggingActivityByMonth', 'Logging activity by month')}</Text>
          <div style={{ position: 'relative', height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 4px 0 4px' }}>
            <div style={{ position: 'absolute', top: 8, left: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80%', pointerEvents: 'none' }}>
              {[activityScale, Math.round(activityScale * 2 / 3), Math.round(activityScale / 3), 0]
                .filter((value, index, values) => values.indexOf(value) === index)
                .map((value) => <Text key={value} size="xs" c="dimmed" style={{ fontSize: 9 }}>{value}</Text>)}
            </div>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, alignItems: 'flex-end', height: 120, marginLeft: 20 }}>
              {monthlyActivity.map((month) => (
                <div key={month.monthIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3, zIndex: 1 }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 9, opacity: month.isFutureMonth ? 0.3 : 1 }}>{month.count}</Text>
                  <Tooltip label={`${month.name}: ${month.count} days`} withArrow>
                    <div style={{ width: '100%', maxWidth: 20, height: `${month.heightPercent}%`, borderRadius: '3px 3px 0 0', backgroundColor: month.isCurrentMonth || month.count > 0 ? 'var(--mantine-primary-color-filled)' : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)', opacity: month.isFutureMonth ? 0.25 : 1, transition: 'height 0.2s ease', cursor: month.isFutureMonth ? 'default' : 'pointer' }} />
                  </Tooltip>
                  <Text size="xs" fw={month.isCurrentMonth ? 700 : 500} c={month.isCurrentMonth ? 'primary' : 'dimmed'} style={{ fontSize: 10, opacity: month.isFutureMonth ? 0.4 : 1 }}>{month.name}</Text>
                </div>
              ))}
            </div>
          </div>
          <Text size="xs" c="dimmed" ta="center" mt={12} style={{ fontSize: 11 }}>{year} · {t('dashboard.daysLogged', 'days logged')}</Text>
        </Paper>

        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>{t('dashboard.tasksByProject', 'Tasks by project')}</Text>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <RingProgress size={110} thickness={5} sections={projectDistribution.filter((item) => item.count > 0).map((item, index) => ({ value: projectTotal ? (item.count / projectTotal) * 100 : 0, color: ['teal', 'orange', 'violet', 'blue', 'pink'][index % 5] }))} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Text fw={800} size="md">{projectTotal}</Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>{t('dashboard.tasksCompleted', 'Tasks')}</Text>
              </div>
            </div>
            <Stack gap={6}>
              {projectDistribution.filter((project) => project.count > 0).map((project, index) => (
                <Group key={project.name} gap={6} wrap="nowrap">
                  <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: ['var(--mantine-color-teal-filled)', 'var(--mantine-color-orange-filled)', 'var(--mantine-color-violet-filled)', 'var(--mantine-color-blue-filled)', 'var(--mantine-color-pink-filled)'][index % 5] }} />
                  <Text size="xs" style={{ fontSize: 11 }}>{project.name}: <b>{project.count} ({projectTotal ? Math.round((project.count / projectTotal) * 100) : 0}%)</b></Text>
                </Group>
              ))}
              {projectTotal === 0 && <Text size="xs" c="dimmed">{t('dashboard.noData', 'No data')}</Text>}
            </Stack>
          </div>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>{t('dashboard.tasksByPriority', 'Tasks by priority')}</Text>
          <Stack gap={10}>
            {priorityDistribution.filter((priority) => priority.count > 0).map((priority) => (
              <div key={priority.key}>
                <Group justify="space-between" align="center" wrap="nowrap" mb={3}>
                  <Group gap={6} wrap="nowrap">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: priority.key === 'urgent' || priority.key === 'high' ? 'var(--mantine-color-red-filled)' : priority.key === 'medium' ? 'var(--mantine-color-orange-filled)' : 'var(--mantine-color-blue-filled)' }} />
                    <Text size="xs" fw={500}>{t(`dashboard.${priority.key}`, priority.key)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>{priority.count} ({taskTotal ? Math.round((priority.count / taskTotal) * 100) : 0}%)</Text>
                </Group>
                <Progress value={taskTotal ? (priority.count / taskTotal) * 100 : 0} color={priority.key === 'urgent' ? 'red' : priority.key} size="xs" radius="xl" />
              </div>
            ))}
            {taskTotal === 0 ? <Text size="xs" c="dimmed">{t('dashboard.noData', 'No data')}</Text> : <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>{t('dashboard.totalTasks', 'Total')}: {taskTotal}</Text>}
          </Stack>
        </Paper>

        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Group gap={6} align="center" mb={10}>
            <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
            <Text size="xs" fw={700} style={{ fontSize: 13 }}>{t('dashboard.keyAchievements', 'Key achievements')}</Text>
          </Group>
          <Stack gap={8}>
            {completedTasks.slice(0, 4).map((task) => (
              <Paper key={task.id} p="xs" radius="md" withBorder onClick={() => onOpenTask(task)} style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}>
                <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <IconCheck size={14} color="var(--mantine-color-teal-filled)" style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>{task.title}</Text>
                  </Group>
                  {task.completedDate && <Text size="xs" c="dimmed" style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>{dayjs(task.completedDate).format('D MMM YYYY')}</Text>}
                </Group>
              </Paper>
            ))}
            {completedTasks.length === 0 && <Text size="xs" c="dimmed">{t('reports.noTasksInPeriod', 'No tasks recorded for this period.')}</Text>}
          </Stack>
          <UnstyledButton onClick={onViewAllAchievements} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}>
            {t('dashboard.viewAllAchievements', 'View all achievements')} <IconChevronRight size={14} />
          </UnstyledButton>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};

const ThemeIconWrapper: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, backgroundColor: `var(--mantine-color-${color}-light)`, color: `var(--mantine-color-${color}-filled)`, flexShrink: 0 }}>
    {children}
  </div>
);
