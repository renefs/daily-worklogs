import React from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconArrowsMaximize,
  IconEdit,
  IconFolderOpen,
  IconTrash,
  IconFolder,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  AreaDefinition,
  KanbanColumnConfig,
  ProjectDefinition,
  TagDefinition,
  TaskMeta,
  TaskPriority,
} from '../../types';
import { getColumnIcon, getColumnTitle } from './columnUtils';
import { resolveTaskContext } from '../../utils/areaProjectUtils';
import classes from './KanbanCard.module.css';

export interface KanbanCardProps {
  task: TaskMeta;
  isDragging: boolean;
  visibleColumns: KanbanColumnConfig[];
  columnBehavior: string;
  onDragStart: (e: React.DragEvent, task: TaskMeta) => void;
  onDragEnd: () => void;
  onOpenEditor: (task: TaskMeta) => void;
  onOpenModal: (task: TaskMeta) => void;
  onUpdateStatus: (filename: string, status: string) => void;
  onDeleteTask: (filename: string) => void;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  storeAllTags: TagDefinition[];
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  isDragging,
  visibleColumns,
  columnBehavior,
  onDragStart,
  onDragEnd,
  onOpenEditor,
  onOpenModal,
  onUpdateStatus,
  onDeleteTask,
  areas,
  projects,
  storeAllTags,
}) => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const getPriorityColor = (priority?: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'blue';
      case 'low':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const priorityColor = getPriorityColor(task.priority);
  const isDone = columnBehavior === 'done';
  const isCancelled = columnBehavior === 'cancelled';
  const isClosed = isDone || isCancelled;
  const taskCtx = resolveTaskContext(task, areas, projects, storeAllTags);

  const taskTags = task.tags || [];
  const visibleTags = taskTags.slice(0, 1);
  const overflowTagsCount = taskTags.length - visibleTags.length;

  return (
    <Paper
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onOpenEditor(task)}
      withBorder
      p="xs"
      radius="md"
      style={{
        cursor: 'grab',
        opacity: isDragging ? 0.4 : isCancelled ? 0.75 : 1,
        transform: isDragging ? 'scale(0.98)' : 'none',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease',
        backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        borderLeft: task.priority
          ? `3px solid var(--mantine-color-${priorityColor}-filled)`
          : '1px solid var(--mantine-color-default-border)',
      }}
      className={clsx(classes.taskCard, 'kanban-task-card')}
    >
      <Stack gap={5}>
        {/* Card Top: Priority dot & Action Menu */}
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={5} wrap="nowrap">
            {task.priority && (
              <Group gap={4} wrap="nowrap">
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: `var(--mantine-color-${priorityColor}-filled)`,
                  }}
                />
                <Text
                  size="xs"
                  c="dimmed"
                  fw={500}
                  style={{ textTransform: 'capitalize', fontSize: 11 }}
                >
                  {t(
                    `tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`
                  )}
                </Text>
              </Group>
            )}
            {isCancelled && (
              <Badge size="xs" color="red" variant="outline">
                {t('tasks.statusCancelled')}
              </Badge>
            )}
          </Group>

          <Menu position="bottom-end" shadow="md" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="xs"
                color="gray"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical size={13} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Item
                leftSection={<IconArrowsMaximize size={14} />}
                onClick={() => onOpenEditor(task)}
              >
                {t('tasks.openInFullEditor', 'Open in Full Editor')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => onOpenModal(task)}
              >
                {t('tasks.quickEdit', 'Quick Edit (Modal)')}
              </Menu.Item>

              <Menu.Label>{t('tasks.moveTo')}</Menu.Label>
              {visibleColumns
                .filter((targetCol) => targetCol.id !== task.status)
                .map((targetCol) => (
                  <Menu.Item
                    key={targetCol.id}
                    onClick={() => onUpdateStatus(task.filename, targetCol.id)}
                    leftSection={getColumnIcon(targetCol.iconName, 14)}
                  >
                    {getColumnTitle(targetCol, t)}
                  </Menu.Item>
                ))}

              {window.electronAPI && task.filepath && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconFolderOpen size={14} />}
                    onClick={() => window.electronAPI.openInFileManager(task.filepath)}
                  >
                    {t('tasks.openInFileManager')}
                  </Menu.Item>
                </>
              )}
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => onDeleteTask(task.filename)}
              >
                {t('tasks.deleteTask')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Task Title */}
        <Text
          fw={600}
          size="xs"
          style={{
            lineHeight: 1.35,
            fontSize: 13,
            textDecoration: isClosed ? 'line-through' : 'none',
            color: isClosed ? 'var(--mantine-color-dimmed)' : 'inherit',
          }}
        >
          {task.title}
        </Text>

        {/* Project / Area label */}
        {(taskCtx.project || taskCtx.area) && (
          <Group gap={4} wrap="nowrap" style={{ color: 'var(--app-sidebar-text-dimmed)' }}>
            <IconFolder size={12} />
            <Text size="xs" c="dimmed" truncate style={{ fontSize: 11 }}>
              {taskCtx.project || taskCtx.area}
            </Text>
          </Group>
        )}

        {/* Card Footer: #ID · Date, Checklist, Tags */}
        <Group justify="space-between" align="center" mt={2} wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            {(task.taskId !== undefined || task.id) && (
              <Text
                size="xs"
                c="dimmed"
                style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
              >
                #{task.taskId ?? task.id}
              </Text>
            )}
            <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
              ·{' '}
              {task.due
                ? dayjs(task.due).format('D MMM')
                : i18n.language === 'es'
                ? 'Sin fecha'
                : 'No date'}
            </Text>
          </Group>

          <Group gap={4} wrap="nowrap">
            {task.checklistTotal !== undefined && task.checklistTotal > 0 && (
              <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                {task.checklistCompleted || 0}/{task.checklistTotal}
              </Text>
            )}

            {visibleTags.map((tag: string) => (
              <Badge
                key={tag}
                size="xs"
                variant="light"
                color="teal"
                radius="sm"
                style={{ fontSize: 10, padding: '0 4px' }}
              >
                #{tag}
              </Badge>
            ))}

            {overflowTagsCount > 0 && (
              <Badge
                size="xs"
                variant="subtle"
                color="gray"
                style={{ fontSize: 10, padding: '0 3px' }}
              >
                +{overflowTagsCount}
              </Badge>
            )}
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
};
