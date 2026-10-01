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
  prevYearCount: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  heightPercent: number;
  prevHeightPercent: number;
}

interface YearlyDashboardProps {
  year: string;
  previousYear: number;
  isDark: boolean;
  activeDaysCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  completionPercent: number;
  monthlyActivity: YearlyMonthActivity[];
  onOpenTask: (task: TaskMeta) => void;
  onViewAllAchievements: () => void;
}

const projectDistribution = [
  { name: 'Monitoring', count: 2, percent: 22, color: '#10b981' },
  { name: 'Webcast & Recording', count: 3, percent: 33, color: '#f59e0b' },
  { name: 'Webcast', count: 4, percent: 44, color: '#8b5cf6' },
];

const priorityDistribution = [
  { key: 'high', label: 'High', count: 3, percent: 33, color: '#e06c75' },
  { key: 'medium', label: 'Medium', count: 3, percent: 33, color: '#d19a66' },
  { key: 'low', label: 'Low', count: 3, percent: 33, color: '#61afef' },
];

const achievements: TaskMeta[] = [
  { id: '1', filename: '1.md', filepath: '', title: 'Change password of sasentrywebcast service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
  { id: '2', filename: '2.md', filepath: '', title: 'Migrate Recordings Manager to Postgresql', status: 'done', created: '2026-08-27', completedDate: '2026-08-27' },
  { id: '3', filename: '3.md', filepath: '', title: 'Remove webcastd service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
  { id: '4', filename: '4.md', filepath: '', title: 'Deploy new CERN Live version', status: 'done', created: '2026-08-27', completedDate: '2026-08-27' },
];

export const YearlyDashboard: React.FC<YearlyDashboardProps> = ({
  year,
  previousYear,
  isDark,
  activeDaysCount,
  completedTasksCount,
  totalTasksCount,
  completionPercent,
  monthlyActivity,
  onOpenTask,
  onViewAllAchievements,
}) => {
  const { t } = useTranslation();
  const cardStyle = { backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' };

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
                <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                  vs {previousYear} <span style={{ fontWeight: 700 }}>{index === 2 ? '+8 pp' : index === 1 ? '+6 tasks' : '+6 days'}</span>
                </Text>
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
              {[30, 20, 10, 0].map((value) => <Text key={value} size="xs" c="dimmed" style={{ fontSize: 9 }}>{value}</Text>)}
            </div>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, alignItems: 'flex-end', height: 120, marginLeft: 20 }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline fill="none" stroke={isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points="4,70 12,60 20,75 28,45 36,65 44,50 52,80 60,70 68,95 76,98 84,98 92,98" />
              </svg>
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
          <Group justify="center" gap={16} mt={12}>
            <Group gap={6} align="center">
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
              <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>{year} ({t('dashboard.daysLogged', 'days logged')})</Text>
            </Group>
            <Group gap={6} align="center">
              <div style={{ width: 14, height: 2, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }} />
              <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>{previousYear} ({t('dashboard.daysLogged', 'days logged')})</Text>
            </Group>
          </Group>
        </Paper>

        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>{t('dashboard.tasksByProject', 'Tasks by project')}</Text>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <svg width="110" height="110" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--app-card-border)" strokeWidth="5" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="5" strokeDasharray="22 78" strokeDashoffset="25" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="5" strokeDasharray="33 67" strokeDashoffset="3" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#8b5cf6" strokeWidth="5" strokeDasharray="44 56" strokeDashoffset="70" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Text fw={800} size="md">46</Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>Tasks</Text>
              </div>
            </div>
            <Stack gap={6}>
              {projectDistribution.map((project) => (
                <Group key={project.name} gap={6} wrap="nowrap">
                  <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: project.color }} />
                  <Text size="xs" style={{ fontSize: 11 }}>{project.name}: <b>{project.count} ({project.percent}%)</b></Text>
                </Group>
              ))}
            </Stack>
          </div>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>{t('dashboard.tasksByPriority', 'Tasks by priority')}</Text>
          <Stack gap={10}>
            {priorityDistribution.map((priority) => (
              <div key={priority.key}>
                <Group justify="space-between" align="center" wrap="nowrap" mb={3}>
                  <Group gap={6} wrap="nowrap">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: priority.color }} />
                    <Text size="xs" fw={500}>{priority.label}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>{priority.count} ({priority.percent}%)</Text>
                </Group>
                <Progress value={priority.percent} color={priority.color} size="xs" radius="xl" />
              </div>
            ))}
            <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>Total: 46 Tasks</Text>
          </Stack>
        </Paper>

        <Paper p="sm" radius="md" withBorder style={cardStyle}>
          <Group gap={6} align="center" mb={10}>
            <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
            <Text size="xs" fw={700} style={{ fontSize: 13 }}>{t('dashboard.keyAchievements', 'Key achievements')}</Text>
          </Group>
          <Stack gap={8}>
            {achievements.map((task) => (
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
