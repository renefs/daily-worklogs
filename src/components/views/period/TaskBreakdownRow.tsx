import React from 'react';
import { Group, Text, Progress, Tooltip, ActionIcon, Badge } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import clsx from 'clsx';
import { TaskMeta, TaskPriority } from '../../../types';
import classes from '../PeriodTasksBreakdown.module.css';

export const PRIORITY_STRIPE: Record<TaskPriority, string> = {
  urgent: 'var(--mantine-color-red-6)',
  high: 'var(--mantine-color-orange-6)',
  medium: 'var(--mantine-color-blue-5)',
  low: 'var(--mantine-color-gray-4)',
};

export interface TaskBreakdownRowProps {
  task: TaskMeta;
  onOpenTask: (task: TaskMeta) => void;
  openLabel: string;
  cancelledLabel: string;
  sinceLabel: (date: string) => string;
  dueLabel: (date: string) => string;
}

export const TaskBreakdownRow: React.FC<TaskBreakdownRowProps> = ({
  task,
  onOpenTask,
  openLabel,
  cancelledLabel,
  sinceLabel,
  dueLabel,
}) => {
  const isCancelled = task.status === 'cancelled';
  const isDone = task.status === 'done' || isCancelled || !!task.completedDate;
  const stripe = task.priority ? PRIORITY_STRIPE[task.priority] : 'transparent';
  const checklistPct =
    task.checklistTotal && task.checklistTotal > 0
      ? Math.round(((task.checklistCompleted || 0) / task.checklistTotal) * 100)
      : null;

  const open = () => onOpenTask(task);

  return (
    <div
      className={clsx(classes.row, 'pbd-row')}
      style={{ borderLeftColor: stripe }}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <Text size="xs" c="dimmed" ff="var(--font-mono)">
        #{task.taskId ?? task.id}
      </Text>
      {task.parent !== undefined && (
        <Badge
          size="xs"
          variant="light"
          color="gray"
          radius="sm"
          style={{ fontSize: 10, padding: '0 4px', textDecoration: 'none' }}
        >
          ↳ #{task.parent}
        </Badge>
      )}

      <Text
        size="sm"
        truncate
        style={{
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--mantine-color-dimmed)' : undefined,
        }}
      >
        {task.title}
      </Text>

      <Group gap={10} wrap="nowrap" justify="flex-end">
        {checklistPct !== null && (
          <Group gap={5} wrap="nowrap">
            <Progress value={checklistPct} size={4} radius="xl" color="teal" w={34} />
            <Text size="xs" c="dimmed" ff="var(--font-mono)">
              {task.checklistCompleted || 0}/{task.checklistTotal}
            </Text>
          </Group>
        )}
        {(task.tags || []).slice(0, 2).map((tag) => (
          <Text key={tag} size="xs" c="dimmed" ff="var(--font-mono)" visibleFrom="md">
            #{tag}
          </Text>
        ))}
        {isCancelled && (
          <Text size="xs" c="red.6">
            {cancelledLabel}
          </Text>
        )}
        {task.completedDate && !isCancelled && (
          <Text size="xs" c="dimmed">
            {task.completedDate}
          </Text>
        )}
        {!task.completedDate && task.startedDate && (
          <Text size="xs" c="dimmed">
            {sinceLabel(task.startedDate)}
          </Text>
        )}
        {!task.completedDate && !task.startedDate && task.due && (
          <Text size="xs" c="dimmed">
            {dueLabel(task.due)}
          </Text>
        )}
        <Tooltip label={openLabel} withArrow>
          <ActionIcon
            className={clsx(classes.rowEdit, 'pbd-row-edit')}
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <IconEdit size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};
