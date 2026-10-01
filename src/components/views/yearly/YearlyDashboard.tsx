import { Group, Paper, Progress, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { PeriodKpiCards } from '../period/PeriodKpiCards';
import { ReportTaskList } from '../period/ReportTaskList';
import classes from './YearlyDashboard.module.css';

export interface YearlyMonthActivity { name: string; monthIndex: number; count: number; isCurrentMonth: boolean; isFutureMonth: boolean; heightPercent: number; }
export interface YearlyDistributionItem { name: string; count: number; }
export interface YearlyPriorityItem { key: string; count: number; }
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
  daysInYear?: number;
  onOpenMonth?: (month: number) => void;
}

export function YearlyDashboard({ year, activeDaysCount, completedTasksCount, totalTasksCount, completionPercent,
  monthlyActivity, completedTasks, projectDistribution, priorityDistribution, onOpenTask, onViewAllAchievements,
  daysInYear = 365, onOpenMonth }: YearlyDashboardProps) {
  const { t } = useTranslation();
  const projectTotal = projectDistribution.reduce((n,p) => n+p.count,0);
  const priorityTotal = priorityDistribution.reduce((n,p) => n+p.count,0);
  return <Stack gap="lg">
    <PeriodKpiCards daysLoggedContent={`${activeDaysCount} ${t('reports.of')} ${daysInYear}`} daysLoggedSubtitle={t('reports.calendarDays')}
      tasksCompletedValue={`${completedTasksCount} ${t('reports.of')} ${totalTasksCount}`} tasksCompletedSubtitle={t('reports.tasksInPeriod')}
      completionRatePercent={completionPercent} completionRateSubtitle={t('reports.completedRatio')} />
    <Paper p="lg" radius="md" withBorder className={classes.panel}>
      <Group justify="space-between" mb="md"><Text fw={600}>{t('dashboard.loggingActivityByMonth')}</Text><Text size="xs" c="dimmed">{t('reports.openMonthHint')}</Text></Group>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {monthlyActivity.map((month) => <UnstyledButton key={month.monthIndex} className={classes.month}
          data-current={month.isCurrentMonth || undefined} onClick={() => onOpenMonth?.(month.monthIndex)}
          aria-label={t('reports.openMonth', { month: month.name, year })}>
          <Group justify="space-between" mb="sm"><Text size="sm" fw={500}>{month.name}</Text><Text size="xs" c="dimmed">{t('reports.loggedDays', { count: month.count })}</Text></Group>
          <Progress value={month.heightPercent} size="sm" color="primary" aria-label={t('reports.monthActivity', { month: month.name })} />
        </UnstyledButton>)}
      </SimpleGrid>
    </Paper>
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <ReportTaskList title={t('dashboard.keyAchievements')} completed tasks={completedTasks} onOpenTask={onOpenTask}
        onViewTasks={onViewAllAchievements} actionLabel={t('dashboard.viewAllAchievements')} />
      <Paper p="lg" radius="md" withBorder className={classes.panel}>
        <Text fw={600} mb="md">{t('dashboard.tasksByProject')}</Text>
        <Stack gap="lg">{projectDistribution.filter((p) => p.count > 0).map((project) => <div key={project.name}>
          <Group justify="space-between" mb="xs"><Text size="sm">{project.name}: {project.count}</Text><Text size="xs" c="dimmed">{Math.round(project.count / projectTotal * 100)}%</Text></Group>
          <Progress value={project.count / projectTotal * 100} size="sm" color="primary" aria-label={project.name} />
        </div>)}{!projectTotal && <Text size="sm" c="dimmed">{t('dashboard.noData')}</Text>}</Stack>
      </Paper>
    </SimpleGrid>
    <Paper p="lg" radius="md" withBorder className={classes.panel}>
      <Text fw={600} mb="md">{t('dashboard.tasksByPriority')}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {priorityDistribution.filter((p) => p.count > 0).map((priority) => <div key={priority.key}>
          <Group justify="space-between" mb="xs"><Text size="sm">{t(`dashboard.${priority.key}`)}</Text><Text size="xs" c="dimmed">{priority.count}</Text></Group>
          <Progress value={priority.count / priorityTotal * 100} size="sm" color="primary" aria-label={t(`dashboard.${priority.key}`)} />
        </div>)}
        {!priorityTotal && <Text size="sm" c="dimmed">{t('dashboard.noData')}</Text>}
      </SimpleGrid>
    </Paper>
  </Stack>;
}
