import React from 'react';
import {
  Group,
  Text,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Stack,
  Button,
  useComputedColorScheme,
} from '@mantine/core';
import { IconPlus, IconLayoutKanban } from '@tabler/icons-react';
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

export interface KanbanColumnProps {
  column: KanbanColumnConfig;
  tasks: TaskMeta[];
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
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const colTitle = getColumnTitle(column, t);

  return (
    <div
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={(e) => onDragLeave(e, column.id)}
      onDrop={(e) => onDrop(e, column.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 10,
        backgroundColor: isTargeted
          ? isDark
            ? 'rgba(59, 130, 246, 0.15)'
            : 'rgba(59, 130, 246, 0.08)'
          : isDark
          ? 'var(--mantine-color-dark-7)'
          : 'var(--mantine-color-gray-1)',
        border: isTargeted
          ? '2px dashed var(--mantine-primary-color-filled)'
          : '1px solid var(--mantine-color-default-border)',
        transition: 'all 0.18s ease',
        flex: '1 1 260px',
        minWidth: 240,
        maxWidth: 420,
        overflow: 'hidden',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
        }}
      >
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
            color="gray"
            onClick={() => onQuickAdd(column.id)}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Column Task Cards Scrollable Area */}
      <ScrollArea style={{ flex: 1 }} p={8} type="auto" offsetScrollbars>
        <Stack gap={8}>
          {tasks.map((task) => {
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
