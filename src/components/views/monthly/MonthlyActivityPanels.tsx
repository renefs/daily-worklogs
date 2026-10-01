import { Group, Paper, Progress, SimpleGrid, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { WorklogDaySummary } from '../../../types';
import classes from './MonthlyActivityPanels.module.css';

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
  date?: string;
  completed: number;
  total: number;
  percent: number;
  isFuture: boolean;
}
export interface MonthlyStatusDistribution {
  completed: number; completedPct: number; inProgress: number; inProgressPct: number;
  pending: number; pendingPct: number; total: number;
}
interface MonthlyActivityPanelsProps {
  isDark: boolean;
  heatmapDays: MonthlyHeatmapDay[];
  weeklyProgress: MonthlyWeeklyProgress[];
  statusDistribution: MonthlyStatusDistribution;
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onOpenWeek?: (date: string) => void;
}

export function MonthlyActivityPanels({ heatmapDays, weeklyProgress, statusDistribution, weekStartDay = 1, onOpenWeek }: MonthlyActivityPanelsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? 'es' : 'en';
  const headers = Array.from({ length: 7 }, (_,i) => dayjs('2026-09-27').add((weekStartDay + i) % 7, 'day').locale(locale).format('ddd'));
  return <>
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Paper p="lg" radius="md" withBorder className={classes.panel}>
        <Text fw={600} mb="md">{t('dashboard.dailyActivity')}</Text>
        <div className={classes.calendar}>
          {headers.map((header) => <Text key={header} size="xs" c="dimmed" ta="center">{header}</Text>)}
          {heatmapDays.map((day,i) => day.date ? <Tooltip key={day.date} label={t('reports.openWeekForDay', { date: day.date })}>
            <UnstyledButton className={classes.day} data-logged={day.note?.exists || undefined}
              data-today={day.isToday || undefined} data-future={day.isFuture || undefined}
              aria-label={t('reports.openWeekForDay', { date: day.date })} onClick={() => day.date && onOpenWeek?.(day.date)}>
              {day.dayNumber}<span className={classes.dot} data-logged={day.note?.exists || undefined} />
            </UnstyledButton>
          </Tooltip> : <span key={i} />)}
        </div>
        <Text size="xs" c="dimmed" mt="md">{t('reports.calendarHint')}</Text>
      </Paper>
      <Paper p="lg" radius="md" withBorder className={classes.panel}>
        <Text fw={600} mb="md">{t('dashboard.weeklyProgress')}</Text>
        <Stack gap="lg">{weeklyProgress.map((week) => <div key={week.date ?? week.label}>
          <Group justify="space-between" mb="xs">
            <UnstyledButton className={classes.weekLink} onClick={() => week.date && onOpenWeek?.(week.date)}>
              <Text size="sm">{week.rangeLabel}</Text><Text size="xs" c="dimmed">{week.label}</Text>
            </UnstyledButton>
            <Text size="xs" c="dimmed">{week.completed} / {week.total} · {week.percent}%</Text>
          </Group>
          <Progress value={week.percent} color="primary" size="sm" aria-label={t('reports.weekCompletion', { period: week.rangeLabel })} />
        </div>)}</Stack>
        <Text size="xs" c="dimmed" mt="md">{t('reports.weeklyChecklistHint')}</Text>
      </Paper>
    </SimpleGrid>
    <Group gap="lg" px="xs" aria-label={t('dashboard.tasksByStatus')}>
      <Text size="sm" c="dimmed">{t('dashboard.tasksByStatus')}</Text>
      <Text size="sm">{t('reports.statusCompleted', { count: statusDistribution.completed })}</Text>
      <Text size="sm">{t('reports.statusInProgress', { count: statusDistribution.inProgress })}</Text>
      <Text size="sm">{t('reports.statusPending', { count: statusDistribution.pending })}</Text>
    </Group>
  </>;
}
