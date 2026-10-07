import React from 'react';
import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconSubtask, IconCornerLeftUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { TaskMeta } from '../../types';
import classes from './TaskRelations.module.css';

export interface TaskRelationsProps {
  /** Numeric ID of the task being edited (undefined while unsaved). */
  taskId?: number;
}

export const TaskRelations: React.FC<TaskRelationsProps> = ({ taskId }) => {
  const { t } = useTranslation();
  const { tasks, openTaskEditor } = useAppStoreSelector((state) => ({
    tasks: state.tasks,
    openTaskEditor: state.openTaskEditor,
  }));

  if (taskId === undefined) return null;

  const current = tasks.find((task) => task.taskId === taskId);
  const parent = current?.parent !== undefined ? tasks.find((task) => task.taskId === current.parent) : undefined;
  const children = tasks.filter((task) => task.parent === taskId);

  if (!parent && children.length === 0) return null;

  const renderItem = (task: TaskMeta) => (
    <UnstyledButton key={task.filename} className={classes.item} onClick={() => void openTaskEditor(task)}>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" ff="monospace" c="dimmed">
          #{task.taskId}
        </Text>
        <Text size="xs" truncate>
          {task.title}
        </Text>
      </Group>
    </UnstyledButton>
  );

  const completedChildren = children.filter((task) => task.status === 'done').length;

  return (
    <Stack gap="xs" className={classes.relations}>
      {parent && (
        <div>
          <Group gap={6} mb={4}>
            <IconCornerLeftUp size={14} />
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t('tasks.parentTask', 'Parent task')}
            </Text>
          </Group>
          {renderItem(parent)}
        </div>
      )}
      {children.length > 0 && (
        <div>
          <Group gap={6} mb={4}>
            <IconSubtask size={14} />
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t('tasks.subtasks', 'Subtasks')} ({completedChildren}/{children.length})
            </Text>
          </Group>
          <Stack gap={2}>{children.map(renderItem)}</Stack>
        </div>
      )}
    </Stack>
  );
};
