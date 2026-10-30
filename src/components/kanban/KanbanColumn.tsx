import React, { useState } from 'react';
import {
  Group,
  Text,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Stack,
  Button,
} from '@mantine/core';
import { IconPlus, IconLayoutKanban, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  AreaDefinition,
  KanbanColumnConfig,
  ProjectDefinition,
  TagDefinition,
  TaskMeta,
} from '../../types';
import { getColumnIcon, getColumnTitle } from './columnUtils';
import { KanbanCard } from './KanbanCard';
import { partitionClosedTasks, sortClosedTasks } from '../../utils/closedTasks';
import classes from './KanbanColumn.module.css';

export interface KanbanColumnProps {
  column: KanbanColumnConfig;
  tasks: TaskMeta[];
  /** Recent window for closed columns in days; null shows all closed tasks. */
  closedWindowDays?: number | null;
  /** When true, closed columns show every matching task regardless of the window. */
  isSearching?: boolean;
  isTargeted: boolean;
  draggingTaskId: string | null;
  visibleColumns: KanbanColumnConfig[];
  columnBehaviorMap: Map<string, string>;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: (e: React.DragEvent, columnId: string) => void;
  onDrop: (e: React.DragEvent, targetStatus: string) => void;
  onDragStart: (e: React.DragEvent, task: TaskMeta) => void;
  onDragEnd: () => void;
  onQuickAdd: (columnId: string) => void;
  onOpenEditor: (task: TaskMeta) => void;
  onOpenModal: (task: TaskMeta) => void;
  onUpdateStatus: (filename: string, status: string) => void;
  onDeleteTask: (filename: string) => void;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  storeAllTags: TagDefinition[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  closedWindowDays = 30,
  isSearching = false,
  isTargeted,
  draggingTaskId,
  visibleColumns,
  columnBehaviorMap,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onQuickAdd,
  onOpenEditor,
  onOpenModal,
  onUpdateStatus,
  onDeleteTask,
  areas,
  projects,
  storeAllTags,
}) => {
  const { t } = useTranslation();

  const [showOlder, setShowOlder] = useState(false);

  const colTitle = getColumnTitle(column, t);

  const isClosedColumn = column.behavior === 'done' || column.behavior === 'cancelled';
  let visibleTasks = tasks;
  let olderCount = 0;
  if (isClosedColumn) {
    const { recent, older } = partitionClosedTasks(sortClosedTasks(tasks), closedWindowDays);
    visibleTasks = isSearching || showOlder ? [...recent, ...older] : recent;
    olderCount = isSearching ? 0 : older.length;
  }

  return (
    <div
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={(e) => onDragLeave(e, column.id)}
      onDrop={(e) => onDrop(e, column.id)}
      className={classes.column}
      data-targeted={isTargeted || undefined}
      style={{ '--column-color': `var(--mantine-color-${column.color || 'blue'}-filled)` } as React.CSSProperties}
    >
      {/* Column Header */}
      <div className={classes.header}>
        <Group gap={6} wrap="nowrap">
          <span style={{ color: `var(--mantine-color-${column.color || 'blue'}-filled)` }}>
            {getColumnIcon(column.iconName, 16)}
          </span>
          <Text fw={700} size="xs" truncate style={{ color: 'var(--app-text-primary)' }}>
            {colTitle}
          </Text>
          <Text size="xs" c="dimmed">
            ({tasks.length})
          </Text>
        </Group>

        <Tooltip label={t('tasks.quickAdd')} withArrow>
          <ActionIcon
            variant="subtle"
            size="xs"
            color={column.color || 'blue'}
            onClick={() => onQuickAdd(column.id)}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Column Task Cards Scrollable Area */}
      <ScrollArea style={{ flex: 1 }} p={8} type="auto" offsetScrollbars>
        <Stack gap={8}>
          {visibleTasks.map((task) => {
            const taskBehavior = columnBehaviorMap.get(task.status) || column.behavior;
            return (
              <KanbanCard
                key={task.id}
                task={task}
                isDragging={draggingTaskId === task.id}
                visibleColumns={visibleColumns}
                columnBehavior={taskBehavior}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpenEditor={onOpenEditor}
                onOpenModal={onOpenModal}
                onUpdateStatus={onUpdateStatus}
                onDeleteTask={onDeleteTask}
                areas={areas}
                projects={projects}
                storeAllTags={storeAllTags}
              />
            );
          })}

          {olderCount > 0 && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              fullWidth
              className={classes.olderToggle}
              rightSection={showOlder ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
              onClick={() => setShowOlder((prev) => !prev)}
            >
              {showOlder ? t('tasks.hideOlder') : t('tasks.showOlder', { count: olderCount })}
            </Button>
          )}

          {/* Empty Column Placeholder */}
          {tasks.length === 0 && (
            <div
              style={{
                padding: '36px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'var(--app-subtle-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--mantine-primary-color-filled)',
                }}
              >
                <IconLayoutKanban size={18} />
              </div>
              <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                {t('tasks.noTasksInColumn')}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                color="primary"
                leftSection={<IconPlus size={13} />}
                onClick={() => onQuickAdd(column.id)}
                style={{ fontSize: 11 }}
              >
                {t('tasks.quickAdd')}
              </Button>
            </div>
          )}
        </Stack>
      </ScrollArea>
    </div>
  );
};
