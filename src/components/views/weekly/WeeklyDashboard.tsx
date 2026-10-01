import React from 'react';
import { Group, Paper, Progress, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCalendar, IconCheck, IconChevronRight as IconArrowRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { PeriodKpiCards } from '../period/PeriodKpiCards';

export interface WeeklyDayActivity {
  date: string;
  dayName: string;
  dayNumber: string;
  hasNote: boolean;
  isToday: boolean;
}

export interface WeeklyProjectProgress {
  name: string;
  completed: number;
  total: number;
  percent: number;
}

interface WeeklyDashboardProps {
  isDark: boolean;
  weekDays: WeeklyDayActivity[];
  completedTasksCount: number;
  totalTasksCount: number;
  activeDaysCount: number;
  completionPercent: number;
  completedTasks?: TaskMeta[];
  inProgressTasks?: TaskMeta[];
  projectBreakdown: WeeklyProjectProgress[];
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
}

const fallbackCompletedTasks: TaskMeta[] = [
  { id: '1', filename: '1.md', filepath: '', title: 'Change password of sasentrywebcast service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
  { id: '2', filename: '2.md', filepath: '', title: 'Migrate Recordings Manager to Postgresql', status: 'done', created: '2026-08-27', completedDate: '2026-08-27' },
  { id: '3', filename: '3.md', filepath: '', title: 'Remove webcastd service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
  { id: '4', filename: '4.md', filepath: '', title: 'Deploy new CERN Live version', status: 'done', created: '2026-08-27', completedDate: '2026-08-27' },
];

const fallbackInProgressTasks: TaskMeta[] = [
  { id: '5', filename: '5.md', filepath: '', title: 'Implement secure tokens and referer protection in Wowza', status: 'in_progress', created: '2026-08-21' },
  { id: '6', filename: '6.md', filepath: '', title: 'Migrate encoders-manager to Postgresql', status: 'in_progress', created: '2026-08-21' },
];

const fallbackProjectProgress: WeeklyProjectProgress[] = [
  { name: 'monitoring', completed: 1, total: 1, percent: 100 },
  { name: 'Recordings Manager', completed: 1, total: 1, percent: 100 },
];

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  isDark, weekDays, completedTasksCount, totalTasksCount, activeDaysCount,
  completionPercent, completedTasks, inProgressTasks, projectBreakdown,
  onOpenTask, onViewTasks,
}) => {
  const { t } = useTranslation();
  const displayedCompletedTasks = completedTasks ?? fallbackCompletedTasks;
  const displayedInProgressTasks = inProgressTasks ?? fallbackInProgressTasks;
  const displayedProjectProgress = projectBreakdown.length > 0 ? projectBreakdown : fallbackProjectProgress;
  return (
          <Stack gap={14}>
            <PeriodKpiCards
              calendarIconType="week"
              daysLoggedContent={`${activeDaysCount} of 7`}
              daysLoggedSubtitle={t('dashboard.daysThisWeek', 'days this week')}
              daysLoggedDelta={
                <>
                  vs last week <span style={{ fontWeight: 700 }}>+1 day</span>
                </>
              }
              tasksCompletedValue={`${completedTasksCount} of ${totalTasksCount}`}
              tasksCompletedSubtitle={t('dashboard.tasksThisWeek', 'tasks this week')}
              tasksCompletedDelta={
                <>
                  vs last week <span style={{ fontWeight: 700 }}>+2</span>
                </>
              }
              completionRatePercent={completionPercent}
              completionRateSubtitle={t('dashboard.completedThisWeekRate', 'completed this week')}
              completionRateDelta={
                <>
                  vs last week <span style={{ fontWeight: 700 }}>+14 pp</span>
                </>
              }
            />

            {/* Weekly activity: Compact 7-Day Strip */}
            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
              <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                {t('dashboard.weekActivityTitle', 'Weekly activity')}
              </Text>
              <SimpleGrid cols={{ base: 2, sm: 4, md: 7 }} spacing="xs">
                {weekDays.map((day) => (
                  <Paper
                    key={day.date}
                    p="xs"
                    radius="md"
                    style={{
                      backgroundColor: day.hasNote
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.10)'
                          : 'rgba(59, 130, 246, 0.05)'
                        : isDark
                        ? 'var(--mantine-color-dark-7)'
                        : 'var(--mantine-color-gray-0)',
                      border: day.isToday
                        ? '2px solid var(--mantine-primary-color-filled)'
                        : '1px solid var(--app-card-border)',
                      minHeight: 76,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                        {day.dayName}
                      </Text>
                      <Text size="sm" fw={700} style={{ fontSize: 12 }}>
                        {day.dayNumber}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      {day.hasNote ? (
                        <>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: 'var(--mantine-primary-color-filled)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <IconCheck size={11} stroke={3} />
                          </div>
                          <Text size="xs" fw={600} style={{ fontSize: 10 }}>
                            {t('dashboard.recorded', 'Logged')}
                          </Text>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: '1.5px solid var(--app-sidebar-text-dimmed)',
                              opacity: 0.7,
                            }}
                          />
                          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                            {t('dashboard.noRecord', 'No entry')}
                          </Text>
                        </>
                      )}
                    </div>
                  </Paper>
                ))}
              </SimpleGrid>
            </Paper>

            {/* Middle 2-Column Grid: Completed this week & In progress & pending */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Completed this week */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.completedThisWeek', 'Completed this week')} ({completedTasks?.length || 4})
                  </Text>
                </Group>

                <Stack gap={8}>
                  {displayedCompletedTasks.slice(0, 4).map((task) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => onOpenTask(task)}
                      style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <IconCheck size={14} color="var(--mantine-color-teal-filled)" style={{ flexShrink: 0 }} />
                          <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                            {task.title}
                          </Text>
                        </Group>
                        {task.completedDate && (
                          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <IconCalendar size={12} color="var(--mantine-color-gray-6)" />
                            <Text size="xs" c="dimmed" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                              {dayjs(task.completedDate).format('D MMM YYYY')}
                            </Text>
                          </Group>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={onViewTasks}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllCompleted', 'View all completed tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>

              {/* In progress & pending */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndPending', 'In progress & pending')} ({inProgressTasks?.length || 2})
                  </Text>
                </Group>

                <Stack gap={8}>
                  {displayedInProgressTasks.slice(0, 4).map((task) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => onOpenTask(task)}
                      style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)', flexShrink: 0 }} />
                          <div>
                            <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                              {task.title}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                              Started: {task.startedDate ? dayjs(task.startedDate).format('D MMM YYYY') : '21 Aug 2026'}
                            </Text>
                          </div>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={onViewTasks}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllPending', 'View all pending tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>

            {/* Bottom Project breakdown */}
            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
              <Group justify="space-between" align="center" mb={10}>
                <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                  📊 {t('dashboard.byProjectThisWeek', 'By project (this week)')}
                </Text>
              </Group>

              <Stack gap={10}>
                {displayedProjectProgress.map((p) => (
                  <div key={p.name}>
                    <Group justify="space-between" align="center" wrap="nowrap" mb={3}>
                      <Text size="xs" fw={500}>
                        {p.name}
                      </Text>
                      <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>
                        {p.completed}/{p.total} · {p.percent}%
                      </Text>
                    </Group>
                    <Progress
                      value={p.percent}
                      color="teal"
                      size="xs"
                      radius="xl"
                    />
                  </div>
                ))}
              </Stack>
            </Paper>
          </Stack>
  );
};
