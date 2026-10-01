import { Button, Group, Paper, Progress, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { PeriodKpiCards } from '../period/PeriodKpiCards';
import { ReportTaskList } from '../period/ReportTaskList';
import classes from './WeeklyDashboard.module.css';

export interface WeeklyDayActivity { date: string; dayName: string; dayNumber: string; hasNote: boolean; isToday: boolean; }
export interface WeeklyProjectProgress { name: string; completed: number; total: number; percent: number; }
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
  onOpenDay?: (date: string) => void;
}

export function WeeklyDashboard({ weekDays, completedTasksCount, totalTasksCount, activeDaysCount,
  completionPercent, completedTasks, inProgressTasks, projectBreakdown, onOpenTask, onViewTasks, onOpenDay }: WeeklyDashboardProps) {
  const { t } = useTranslation();
  return <Stack gap="lg">
    <PeriodKpiCards daysLoggedContent={`${activeDaysCount} ${t('reports.of')} 7`} daysLoggedSubtitle={t('reports.calendarDays')}
      tasksCompletedValue={`${completedTasksCount} ${t('reports.of')} ${totalTasksCount}`} tasksCompletedSubtitle={t('reports.tasksInPeriod')}
      completionRatePercent={completionPercent} completionRateSubtitle={t('reports.completedRatio')} />
    <Paper p="lg" radius="md" withBorder className={classes.panel}>
      <Group justify="space-between" mb="md"><Text fw={600}>{t('dashboard.weekActivityTitle')}</Text><Text size="xs" c="dimmed">{t('reports.openDayHint')}</Text></Group>
      <div className={classes.week}>
        {weekDays.map((day) => <UnstyledButton key={day.date} className={classes.day} data-logged={day.hasNote || undefined} data-today={day.isToday || undefined}
          onClick={() => onOpenDay?.(day.date)} aria-label={t('reports.openDay', { date: day.date })}>
          <Text size="xs" c="dimmed">{day.dayName}</Text><Text className={classes.dayNumber}>{day.dayNumber}</Text>
          <span className={classes.dot} data-logged={day.hasNote || undefined} />
          <Text size="xs" c="dimmed">{t(day.hasNote ? 'dashboard.recorded' : 'dashboard.noRecord')}</Text>
        </UnstyledButton>)}
      </div>
    </Paper>
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <ReportTaskList title={t('reports.completedWork')} completed tasks={completedTasks} onOpenTask={onOpenTask}
        onViewTasks={onViewTasks} actionLabel={t('dashboard.viewAllCompleted')} />
      <Paper p="lg" radius="md" withBorder className={classes.panel}>
        <Text fw={600} mb="md">{t('reports.projectProgress')}</Text>
        <Stack gap="lg">{projectBreakdown.map((project) => <div key={project.name}>
          <Group justify="space-between" mb="xs"><Text size="sm">{project.name}</Text><Text size="xs" c="dimmed">{project.completed} / {project.total} · {project.percent}%</Text></Group>
          <Progress value={project.percent} size="sm" color="primary" aria-label={project.name} />
        </div>)}{projectBreakdown.length === 0 && <Text size="sm" c="dimmed">{t('dashboard.noData')}</Text>}</Stack>
        <Button variant="subtle" size="compact-sm" mt="lg" onClick={onViewTasks}>{t('nav.tasks')}</Button>
      </Paper>
    </SimpleGrid>
    {!!inProgressTasks?.length && <ReportTaskList title={t('dashboard.inProgressAndPending')} tasks={inProgressTasks}
      onOpenTask={onOpenTask} onViewTasks={onViewTasks} actionLabel={t('dashboard.viewAllPending')} />}
  </Stack>;
}
