import React from 'react';
import { Group, Paper, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { WorklogDaySummary } from '../../../types';

export interface MonthlyHeatmapDay {
  dayNumber: number | null;
  date: string | null;
  level: number;
  note: WorklogDaySummary | null | undefined;
  isFuture: boolean;
  isToday: boolean;
}

export interface MonthlyWeeklyProgress {
  label: string;
  rangeLabel: string;
  completed: number;
  total: number;
  percent: number;
  isFuture: boolean;
}

export interface MonthlyStatusDistribution {
  completed: number;
  completedPct: number;
  inProgress: number;
  inProgressPct: number;
  pending: number;
  pendingPct: number;
  total: number;
}

interface MonthlyActivityPanelsProps {
  isDark: boolean;
  heatmapDays: MonthlyHeatmapDay[];
  weeklyProgress: MonthlyWeeklyProgress[];
  statusDistribution: MonthlyStatusDistribution;
}

export const MonthlyActivityPanels: React.FC<MonthlyActivityPanelsProps> = ({
  isDark,
  heatmapDays,
  weeklyProgress,
  statusDistribution,
}) => {
  const { t } = useTranslation();
  return (
    <>
            {/* 3-Column Middle Grid: Daily activity (Left) / Weekly progress (Center) / Tasks by status (Right) */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              {/* Col 1: Daily Activity Heatmap */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.dailyActivity', 'Daily activity')}
                </Text>

                {/* Day of week headers */}
                <SimpleGrid cols={7} spacing={4} mb={6}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayHeader, idx) => (
                    <Text key={idx} size="xs" c="dimmed" fw={600} ta="center" style={{ fontSize: 10 }}>
                      {dayHeader}
                    </Text>
                  ))}
                </SimpleGrid>

                {/* Days grid */}
                <SimpleGrid cols={7} spacing={4}>
                  {heatmapDays.map((item, idx) => {
                    if (!item.dayNumber) {
                      return <div key={idx} style={{ aspectRatio: '1', borderRadius: 4 }} />;
                    }

                    const colors = isDark
                      ? ['rgba(255, 255, 255, 0.05)', '#1e3a8a', '#2563eb', '#60a5fa']
                      : ['rgba(0, 0, 0, 0.03)', '#bfdbfe', '#3b82f6', '#1d4ed8'];

                    const bgColor = item.isToday
                      ? 'var(--mantine-primary-color-filled)'
                      : item.isFuture
                      ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)')
                      : colors[item.level];

                    const borderStyle = item.isFuture
                      ? '1px dashed rgba(140, 140, 140, 0.2)'
                      : 'none';

                    return (
                      <Tooltip
                        key={idx}
                        label={
                          item.isFuture
                            ? `${item.date}: Future date`
                            : item.note?.exists
                            ? `${item.date}: ${item.note.tasksCompleted}/${item.note.tasksTotal} tasks`
                            : `${item.date}: No entry`
                        }
                        withArrow
                        position="top"
                      >
                        <div
                          style={{
                            aspectRatio: '1',
                            borderRadius: 4,
                            backgroundColor: bgColor,
                            border: borderStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: item.isToday ? 700 : 500,
                            color: item.isToday ? '#ffffff' : item.isFuture ? 'var(--app-sidebar-text-dimmed)' : (item.level >= 2 ? '#ffffff' : 'inherit'),
                            opacity: item.isFuture ? 0.45 : 1,
                            cursor: item.isFuture ? 'default' : 'pointer',
                          }}
                        >
                          {item.dayNumber}
                        </div>
                      </Tooltip>
                    );
                  })}
                </SimpleGrid>

                {/* Heatmap Legend */}
                <Group justify="flex-start" gap={8} mt={14} align="center">
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.noEntry', 'No entry')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#1e3a8a' : '#bfdbfe' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.low', 'Low')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#2563eb' : '#3b82f6' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.medium', 'Medium')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#60a5fa' : '#1d4ed8' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.high', 'High')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed rgba(140, 140, 140, 0.35)', backgroundColor: 'transparent' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.future', 'Future')}</Text>
                </Group>
              </Paper>

              {/* Col 2: Weekly Progress Vertical Bars */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.weeklyProgress', 'Weekly progress')}
                </Text>

                <div style={{ display: 'flex', height: 140, alignItems: 'flex-end', gap: 12, padding: '10px 4px 4px 4px' }}>
                  {/* Y Axis */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', paddingRight: 4 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>100%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>75%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>50%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>25%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>0%</Text>
                  </div>

                  {/* Bars */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, height: '100%', alignItems: 'flex-end' }}>
                    {weeklyProgress.slice(0, 5).map((w, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        {!w.isFuture && (
                          <Text size="xs" fw={600} style={{ fontSize: 10, marginBottom: 4 }}>
                            {w.percent}%
                          </Text>
                        )}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 24,
                            height: w.isFuture ? '60%' : `${Math.max(6, w.percent)}%`,
                            backgroundColor: w.isFuture
                              ? 'transparent'
                              : w.percent > 0
                              ? 'var(--mantine-primary-color-filled)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                            border: w.isFuture ? '1px dashed rgba(140, 140, 140, 0.3)' : 'none',
                            borderRadius: '3px 3px 0 0',
                            opacity: w.isFuture ? 0.35 : 1,
                          }}
                        />
                        <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 10 }}>
                          {w.label}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                <Group justify="center" gap={6} mt={10}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    {t('dashboard.completedPct', 'Completed (%)')}
                  </Text>
                </Group>
              </Paper>

              {/* Col 3: Tasks by Status Donut Chart */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByStatus', 'Tasks by status')}
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    <svg width="100" height="100" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--app-card-border)" strokeWidth="6" />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="var(--mantine-color-teal-filled)"
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.completedPct} ${100 - statusDistribution.completedPct}`}
                        strokeDashoffset="25"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="var(--mantine-color-orange-filled)"
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.inProgressPct} ${100 - statusDistribution.inProgressPct}`}
                        strokeDashoffset={`${25 - statusDistribution.completedPct}`}
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)'}
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.pendingPct} ${100 - statusDistribution.pendingPct}`}
                        strokeDashoffset={`${25 - statusDistribution.completedPct - statusDistribution.inProgressPct}`}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fw={700} size="xs" style={{ fontSize: 10, color: 'var(--app-sidebar-text-dimmed)' }}>Total:</Text>
                      <Text fw={800} size="xs" style={{ fontSize: 12 }}>
                        {statusDistribution.total} tasks
                      </Text>
                    </div>
                  </div>

                  <Stack gap={4}>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-teal-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        Done: <b>{statusDistribution.completed} ({statusDistribution.completedPct}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        In progress & carried over: <b>{statusDistribution.inProgress} ({statusDistribution.inProgressPct}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-5)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        To do: <b>{statusDistribution.pending} ({statusDistribution.pendingPct}%)</b>
                      </Text>
                    </Group>
                  </Stack>
                </div>

                <Text size="xs" c="dimmed" ta="center" mt={12} style={{ fontSize: 10 }}>
                  {t('dashboard.basedOnActiveTasks', 'Based on active tasks this month')}
                </Text>
              </Paper>
            </SimpleGrid>
    </>
  );
};
