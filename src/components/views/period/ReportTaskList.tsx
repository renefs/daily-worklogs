import { Button, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconCircle, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';
import classes from './ReportTaskList.module.css';

interface ReportTaskListProps {
  title: string;
  tasks?: TaskMeta[];
  completed?: boolean;
  actionLabel: string;
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
}

export function ReportTaskList({ title, tasks = [], completed, actionLabel, onOpenTask, onViewTasks }: ReportTaskListProps) {
  const { t } = useTranslation();
  return <Paper p="lg" radius="md" withBorder className={classes.panel}>
    <Group justify="space-between" mb="md"><Text fw={600}>{title}</Text><Text size="xs" c="dimmed">{tasks.length}</Text></Group>
    <Stack gap={0}>
      {tasks.slice(0,4).map((task) => <UnstyledButton key={task.id} onClick={() => onOpenTask(task)} className={classes.task}>
        {completed ? <IconCheck size={17} className={classes.icon} /> : <IconCircle size={15} className={classes.icon} />}
        <div className={classes.details}><Text size="sm" fw={500}>{task.title}</Text>
          <Text size="xs" c="dimmed">{[task.taskId ? `#${task.taskId}` : null, task.project || task.area].filter(Boolean).join(' · ')}</Text>
        </div>
      </UnstyledButton>)}
      {tasks.length === 0 && <Text size="sm" c="dimmed">{t('reports.noTasksInPeriod')}</Text>}
    </Stack>
    <Button variant="subtle" size="compact-sm" mt="md" rightSection={<IconChevronRight size={14} />} onClick={onViewTasks}>{actionLabel}</Button>
  </Paper>;
}
