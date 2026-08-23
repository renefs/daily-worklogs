import React, { useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  Badge,
  TextInput,
  Select,
  Paper,
  ScrollArea,
  Menu,
  Tooltip,
  Progress,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconFolderOpen,
  IconCalendar,
  IconTag,
  IconChecklist,
  IconAlertCircle,
  IconLayoutKanban,
  IconRefresh,
  IconAdjustments,
  IconEye,
  IconEyeOff,
  IconHistory,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig, TaskItem, TaskPriority } from '../../types';
import { getColumnIcon, getColumnTitle } from '../kanban/columnUtils';

export const KanbanView: React.FC = () => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    settings,
    tasks,
    isTasksLoading,
    refreshTasksList,
    updateTaskStatus,
    deleteTask,
    openTaskModal,
    openSettings,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // All configured columns
  const allColumns: KanbanColumnConfig[] = useMemo(() => {
    return settings?.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;
  }, [settings?.kanbanColumns]);

  // Filter only visible columns for board display
  const visibleColumns = useMemo(() => {
    const vis = allColumns.filter((c) => c.visible !== false);
    return vis.length > 0 ? vis : allColumns.slice(0, 1);
  }, [allColumns]);

  // Create behavior map for fast lookup
  const columnBehaviorMap = useMemo(() => {
    const map = new Map<string, string>();
    allColumns.forEach((c) => map.set(c.id, c.behavior));
    return map;
  }, [allColumns]);

  // Helper to check if a task is closed/completed and older than 30 days
  const isTaskOldClosed = useMemo(() => {
    return (task: TaskItem) => {
      const behavior = columnBehaviorMap.get(task.status) || task.status;
      const isClosed =
        behavior === 'done' ||
        behavior === 'cancelled' ||
        task.status === 'done' ||
        task.status === 'cancelled' ||
        task.status === 'completed';

      if (!isClosed) return false;

      const dateStr =
        task.completedDate ||
        (task.lastModified ? dayjs(task.lastModified).format('YYYY-MM-DD') : null) ||
        task.created;

      if (!dateStr) return false;

      const diffDays = dayjs().diff(dayjs(dateStr), 'day');
      return diffDays >= 30;
    };
  }, [columnBehaviorMap]);

  // Count hidden closed tasks older than 30 days
  const hiddenTasksCount = useMemo(() => {
    return tasks.filter(isTaskOldClosed).length;
  }, [tasks, isTaskOldClosed]);

  // Collect all unique tags from tasks
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.tags) {
        task.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const hideOld = (settings?.hideCompletedOlderThan30Days ?? false) && !showHiddenTasks;

    return tasks.filter((task) => {
      // Hide old completed/closed tasks if option is enabled and not manually revealed
      if (hideOld && isTaskOldClosed(task)) {
        return false;
      }

      // Search match
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesContent = task.content.toLowerCase().includes(query);
        const matchesTags = task.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }

      // Priority match
      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }

      // Tag match
      if (tagFilter !== 'all') {
        if (!task.tags || !task.tags.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [tasks, search, priorityFilter, tagFilter, settings?.hideCompletedOlderThan30Days, showHiddenTasks, isTaskOldClosed]);

  // Group tasks by column status
  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};

    allColumns.forEach((col) => {
      map[col.id] = [];
    });

    const defaultFallbackStatus = visibleColumns[0]?.id || 'todo';
    if (!map[defaultFallbackStatus]) {
      map[defaultFallbackStatus] = [];
    }

    filteredTasks.forEach((task) => {
      const taskStatus = task.status || defaultFallbackStatus;
      if (map[taskStatus]) {
        map[taskStatus].push(task);
      } else {
        // If task has an unrecognized status, put in fallback column or dynamically assign
        if (!map[taskStatus]) {
          map[taskStatus] = [];
        }
        map[taskStatus].push(task);
      }
    });

    return map;
  }, [filteredTasks, allColumns, visibleColumns]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData('text/plain', JSON.stringify({ filename: task.filename, status: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { filename, status: sourceStatus } = JSON.parse(rawData);

      if (filename && sourceStatus !== targetStatus) {
        await updateTaskStatus(filename, targetStatus);
        const targetCol = allColumns.find((c) => c.id === targetStatus);
        const colTitle = targetCol ? getColumnTitle(targetCol, t) : targetStatus;

        notifications.show({
          title: t('tasks.statusUpdated', { status: colTitle }),
          message: filename,
          color: 'teal',
          autoClose: 2000,
        });
      }
    } catch (err) {
      console.error('Failed to handle drop:', err);
    }
  };

  // Due date helper
  const renderDueDateBadge = (due?: string) => {
    if (!due) return null;
    const today = dayjs().format('YYYY-MM-DD');
    const isOverdue = due < today;
    const isToday = due === today;

    let badgeColor = 'gray';
    let badgeText = dayjs(due).format('MMM D');

    if (isOverdue) {
      badgeColor = 'red';
      badgeText = `${dayjs(due).format('MMM D')} (${t('tasks.overdue')})`;
    } else if (isToday) {
      badgeColor = 'orange';
      badgeText = t('tasks.dueToday');
    }

    return (
      <Badge
        size="xs"
        color={badgeColor}
        variant={isOverdue || isToday ? 'filled' : 'light'}
        leftSection={isOverdue ? <IconAlertCircle size={11} /> : <IconCalendar size={11} />}
      >
        {badgeText}
      </Badge>
    );
  };

  // Priority color helper
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

  // Count done or cancelled tasks
  const totalCompleted = useMemo(() => {
    return tasks.filter((t) => {
      const b = columnBehaviorMap.get(t.status) || t.status;
      return b === 'done' || b === 'cancelled';
    }).length;
  }, [tasks, columnBehaviorMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Top Header & Toolbar */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="xs">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'var(--mantine-primary-color-light)',
              color: 'var(--mantine-primary-color-filled)',
            }}
          >
            <IconLayoutKanban size={20} />
          </div>
          <div>
            <Title order={3}>{t('tasks.title')}</Title>
            <Text size="xs" c="dimmed">
              {tasks.length} {t('common.tasks')} • {totalCompleted} {t('tasks.statusDone').toLowerCase()}
            </Text>
          </div>
        </Group>

        <Group gap="xs">
          <Tooltip label="Refresh tasks" withArrow>
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={() => refreshTasksList()}
              loading={isTasksLoading}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('tasks.boardSettings')} withArrow>
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={() => openSettings('kanban')}
            >
              <IconAdjustments size={16} />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="filled"
            color="primary"
            leftSection={<IconPlus size={16} />}
            onClick={() => openTaskModal(null, visibleColumns[0]?.id || 'todo')}
            radius="md"
          >
            {t('tasks.newTask')}
          </Button>
        </Group>
      </Group>

      {/* Filter Bar */}
      <Paper p="xs" withBorder radius="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <TextInput
            placeholder={t('tasks.searchPlaceholder')}
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius="md"
            size="xs"
            style={{ flex: 1, minWidth: 220 }}
          />

          <Group gap="xs">
            <Select
              placeholder={t('tasks.filterByPriority')}
              leftSection={<IconFilter size={14} />}
              value={priorityFilter}
              onChange={(val) => val && setPriorityFilter(val)}
              data={[
                { value: 'all', label: t('tasks.allPriorities') },
                { value: 'urgent', label: t('tasks.priorityUrgent') },
                { value: 'high', label: t('tasks.priorityHigh') },
                { value: 'medium', label: t('tasks.priorityMedium') },
                { value: 'low', label: t('tasks.priorityLow') },
              ]}
              radius="md"
              size="xs"
              style={{ width: 140 }}
              allowDeselect={false}
            />

            {allTags.length > 0 && (
              <Select
                placeholder={t('tasks.filterByTag')}
                leftSection={<IconTag size={14} />}
                value={tagFilter}
                onChange={(val) => val && setTagFilter(val)}
                data={[
                  { value: 'all', label: t('tasks.allTags') },
                  ...allTags.map((tag) => ({ value: tag, label: `#${tag}` })),
                ]}
                radius="md"
                size="xs"
                style={{ width: 140 }}
                allowDeselect={false}
              />
            )}

            {settings?.hideCompletedOlderThan30Days && (
              <Tooltip
                label={
                  showHiddenTasks
                    ? t('tasks.hideHiddenTasks')
                    : t('tasks.showHiddenTasks', { count: hiddenTasksCount })
                }
                withArrow
              >
                <Button
                  variant={showHiddenTasks ? 'light' : 'subtle'}
                  color={showHiddenTasks ? 'orange' : 'gray'}
                  size="xs"
                  radius="md"
                  leftSection={showHiddenTasks ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  onClick={() => setShowHiddenTasks((prev) => !prev)}
                >
                  {showHiddenTasks
                    ? t('tasks.hideHiddenTasks')
                    : t('tasks.showHiddenTasks', { count: hiddenTasksCount })}
                </Button>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Hidden Tasks Notification Banner */}
      {settings?.hideCompletedOlderThan30Days && !showHiddenTasks && hiddenTasksCount > 0 && (
        <Paper
          withBorder
          px="sm"
          py={6}
          radius="md"
          style={{
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.2)',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <IconEyeOff size={15} color="var(--mantine-color-orange-filled)" />
              <Text size="xs" c={isDark ? 'orange.2' : 'orange.9'} fw={500}>
                {hiddenTasksCount === 1
                  ? t('tasks.hiddenTasksBanner', { count: hiddenTasksCount })
                  : t('tasks.hiddenTasksBanner_plural', { count: hiddenTasksCount })}
              </Text>
            </Group>
            <Button
              variant="subtle"
              color="orange"
              size="compact-xs"
              onClick={() => setShowHiddenTasks(true)}
              leftSection={<IconEye size={12} />}
            >
              {t('tasks.showAll')}
            </Button>
          </Group>
        </Paper>
      )}

      {/* Kanban Board Columns Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(260px, 1fr))`,
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {visibleColumns.map((col) => {
          const columnTasks = tasksByColumn[col.id] || [];
          const isTargeted = dragOverColumn === col.id;
          const colTitle = getColumnTitle(col, t);

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
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
                minWidth: 260,
                overflow: 'hidden',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
                }}
              >
                <Group gap={6} wrap="nowrap">
                  <span style={{ color: `var(--mantine-color-${col.color || 'blue'}-filled)` }}>
                    {getColumnIcon(col.iconName, 17)}
                  </span>
                  <Text fw={700} size="sm" truncate>
                    {colTitle}
                  </Text>
                  <Badge size="xs" color={col.color || 'blue'} variant="light">
                    {columnTasks.length}
                  </Badge>
                </Group>

                <Tooltip label={t('tasks.quickAdd')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={col.color || 'blue'}
                    onClick={() => openTaskModal(null, col.id)}
                  >
                    <IconPlus size={15} />
                  </ActionIcon>
                </Tooltip>
              </div>

              {/* Column Task Cards Scrollable Area */}
              <ScrollArea style={{ flex: 1 }} p={8} type="auto" offsetScrollbars>
                <Stack gap={8}>
                  {columnTasks.map((task) => {
                    const isDragging = draggingTaskId === task.id;
                    const priorityColor = getPriorityColor(task.priority);
                    const taskBehavior = columnBehaviorMap.get(task.status) || col.behavior;
                    const isDone = taskBehavior === 'done';
                    const isCancelled = taskBehavior === 'cancelled';
                    const isClosed = isDone || isCancelled;

                    return (
                      <Paper
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openTaskModal(task)}
                        withBorder
                        p="xs"
                        radius="md"
                        style={{
                          cursor: 'grab',
                          opacity: isDragging ? 0.4 : isCancelled ? 0.75 : 1,
                          transform: isDragging ? 'scale(0.98)' : 'none',
                          transition: 'box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease',
                          backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : '#ffffff',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        }}
                        className="kanban-task-card"
                      >
                        <Stack gap={6}>
                          {/* Card Top: Priority & Action Menu */}
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Group gap={4} wrap="nowrap">
                              {task.priority && (
                                <Badge
                                  size="xs"
                                  color={priorityColor}
                                  variant="filled"
                                  style={{ textTransform: 'capitalize' }}
                                >
                                  {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
                                </Badge>
                              )}
                              {isCancelled && (
                                <Badge size="xs" color="red" variant="outline">
                                  {t('tasks.statusCancelled')}
                                </Badge>
                              )}
                              {isTaskOldClosed(task) && (
                                <Tooltip label={t('tasks.hiddenBadgeTooltip')} withArrow>
                                  <Badge
                                    size="xs"
                                    color="orange"
                                    variant="light"
                                    leftSection={<IconHistory size={10} />}
                                  >
                                    {t('tasks.hiddenBadge')}
                                  </Badge>
                                </Tooltip>
                              )}
                              {renderDueDateBadge(task.due)}
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
                                  leftSection={<IconEdit size={14} />}
                                  onClick={() => openTaskModal(task)}
                                >
                                  {t('tasks.editTask')}
                                </Menu.Item>

                                <Menu.Label>{t('tasks.moveTo')}</Menu.Label>
                                {visibleColumns
                                  .filter((targetCol) => targetCol.id !== task.status)
                                  .map((targetCol) => (
                                    <Menu.Item
                                      key={targetCol.id}
                                      onClick={() => updateTaskStatus(task.filename, targetCol.id)}
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
                                  onClick={() => deleteTask(task.filename)}
                                >
                                  {t('tasks.deleteTask')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>

                          {/* Task Title */}
                          <Text
                            fw={600}
                            size="sm"
                            style={{
                              lineHeight: 1.35,
                              textDecoration: isClosed ? 'line-through' : 'none',
                              color: isClosed ? 'var(--mantine-color-dimmed)' : 'inherit',
                            }}
                          >
                            {task.title}
                          </Text>

                          {/* Checklist progress if present */}
                          {task.checklistTotal !== undefined && task.checklistTotal > 0 && (
                            <Group gap={6} align="center">
                              <IconChecklist size={14} color="var(--mantine-color-dimmed)" />
                              <Text size="xs" c="dimmed">
                                {task.checklistCompleted}/{task.checklistTotal}
                              </Text>
                              <Progress
                                value={((task.checklistCompleted || 0) / task.checklistTotal) * 100}
                                size="xs"
                                radius="xl"
                                color="teal"
                                style={{ flex: 1 }}
                              />
                            </Group>
                          )}

                          {/* Tags pills */}
                          {task.tags && task.tags.length > 0 && (
                            <Group gap={4} wrap="wrap">
                              {task.tags.map((tag) => (
                                <Badge key={tag} size="xs" variant="outline" color="gray" radius="sm">
                                  #{tag}
                                </Badge>
                              ))}
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}

                  {/* Empty Column Drop Placeholder */}
                  {columnTasks.length === 0 && (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        borderRadius: 8,
                        border: '1px dashed var(--mantine-color-default-border)',
                        color: 'var(--mantine-color-dimmed)',
                        fontSize: 12,
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        {t('tasks.noTasksInColumn')}
                      </Text>
                      <Text size="xs" c="dimmed" fs="italic" mt={4}>
                        {t('tasks.dragDropHint')}
                      </Text>
                    </div>
                  )}
                </Stack>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
};
