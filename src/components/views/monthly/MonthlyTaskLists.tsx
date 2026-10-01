import { SimpleGrid } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import { ReportTaskList } from '../period/ReportTaskList';

interface MonthlyTaskListsProps {
  completedTasks?: TaskMeta[];
  inProgressTasks?: TaskMeta[];
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
}
export function MonthlyTaskLists({ completedTasks, inProgressTasks, onOpenTask, onViewTasks }: MonthlyTaskListsProps) {
  const { t } = useTranslation();
  return <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
    <ReportTaskList title={t('dashboard.keyAchievements')} tasks={completedTasks} completed onOpenTask={onOpenTask}
      onViewTasks={onViewTasks} actionLabel={t('dashboard.viewAllCompleted')} />
    <ReportTaskList title={t('dashboard.inProgressAndPending')} tasks={inProgressTasks} onOpenTask={onOpenTask}
      onViewTasks={onViewTasks} actionLabel={t('dashboard.viewAllPending')} />
  </SimpleGrid>;
}
