import type { ReactNode } from 'react';
import { Group, Paper, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { IconCalendarEvent, IconCircleCheck, IconChartBar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './PeriodKpiCards.module.css';

export interface PeriodKpiCardsProps {
  daysLoggedContent: ReactNode;
  daysLoggedSubtitle?: string;
  daysLoggedDelta?: ReactNode;
  tasksCompletedValue: string;
  tasksCompletedSubtitle?: string;
  tasksCompletedDelta?: ReactNode;
  completionRatePercent: number;
  completionRateSubtitle?: string;
  completionRateDelta?: ReactNode;
  calendarIconType?: 'week' | 'month';
}

export function PeriodKpiCards({ daysLoggedContent, daysLoggedSubtitle, daysLoggedDelta,
  tasksCompletedValue, tasksCompletedSubtitle, tasksCompletedDelta,
  completionRatePercent, completionRateSubtitle, completionRateDelta }: PeriodKpiCardsProps) {
  const { t } = useTranslation();
  const metrics = [
    { tone: 'primary', Icon: IconCalendarEvent, label: t('dashboard.daysLogged'), value: daysLoggedContent, subtitle: daysLoggedSubtitle, delta: daysLoggedDelta },
    { tone: 'teal', Icon: IconCircleCheck, label: t('dashboard.tasksCompleted'), value: tasksCompletedValue, subtitle: tasksCompletedSubtitle, delta: tasksCompletedDelta },
    { tone: 'violet', Icon: IconChartBar, label: t('dashboard.completionRate'), value: `${completionRatePercent}%`, subtitle: completionRateSubtitle, delta: completionRateDelta },
  ];
  return <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
    {metrics.map((metric) => <Paper key={metric.label} p="lg" radius="md" withBorder className={classes.card} data-tone={metric.tone}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>{metric.label}</Text>
        <ThemeIcon color={metric.tone} variant="light" size={36} radius="md"><metric.Icon size={20} /></ThemeIcon>
      </Group>
      <div className={classes.value}>{metric.value}</div>
      {metric.subtitle && <Text size="xs" c="dimmed">{metric.subtitle}</Text>}
      {metric.delta && <Text size="xs" c="primary" mt="xs">{metric.delta}</Text>}
    </Paper>)}
  </SimpleGrid>;
}
