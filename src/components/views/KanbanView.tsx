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
  IconInbox,
  IconCircleDot,
  IconPlayerPlay,
  IconHourglass,
  IconCircleCheck,
  IconAlertCircle,
  IconLayoutKanban,
  IconRefresh,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { TaskItem, TaskPriority, TaskStatus } from '../../types';

interface ColumnConfig {
  id: TaskStatus;
  titleKey: string;
  color: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    titleKey: 'tasks.columnBacklog',
    color: 'gray',
    icon: <IconInbox size={17} />,
  },
  {
    id: 'todo',
    titleKey: 'tasks.columnTodo',
    color: 'blue',
    icon: <IconCircleDot size={17} />,
  },
  {
    id: 'in_progress',
    titleKey: 'tasks.columnInProgress',
    color: 'indigo',
    icon: <IconPlayerPlay size={17} />,
  },
  {
    id: 'waiting',
    titleKey: 'tasks.columnWaiting',
    color: 'yellow',
    icon: <IconHourglass size={17} />,
  },
  {
    id: 'done',
    titleKey: 'tasks.columnDone',
    color: 'teal',
    icon: <IconCircleCheck size={17} />,
  },
];

export const KanbanView: React.FC = () => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    tasks,
    isTasksLoading,
    refreshTasksList,
    updateTaskStatus,
    deleteTask,
    openTaskModal,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

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
    return tasks.filter((task) => {
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
  }, [tasks, search, priorityFilter, tagFilter]);

  // Group tasks by column status
  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      waiting: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      const status = task.status && map[task.status] ? task.status : 'todo';
      map[status].push(task);
    });

    return map;
  }, [filteredTasks]);

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

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: TaskStatus) => {
    // Only clear if leaving the column element itself
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { filename, status: sourceStatus } = JSON.parse(rawData);

      if (filename && sourceStatus !== targetStatus) {
        await updateTaskStatus(filename, targetStatus);
        notifications.show({
          title: t('tasks.statusUpdated', { status: t(`tasks.status${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1).replace('_', '')}`) }),
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

  const totalDone = tasksByColumn.done.length;

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
              {tasks.length} {t('common.tasks')} • {totalDone} {t('tasks.statusDone').toLowerCase()}
            </Text>
          </div>
        </Group>

        <Group gap="xs">
          <Tooltip label="Refresh tasks" withArrow>
            <ActionIcon variant="default" size="lg" radius="md" onClick={() => refreshTasksList()} loading={isTasksLoading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="filled"
            color="primary"
            leftSection={<IconPlus size={16} />}
            onClick={() => openTaskModal(null, 'todo')}
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
          </Group>
        </Group>
      </Paper>

      {/* Kanban Board Columns Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(240px, 1fr))',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {COLUMNS.map((col) => {
          const columnTasks = tasksByColumn[col.id] || [];
          const isTargeted = dragOverColumn === col.id;

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
                minWidth: 240,
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
                  <span style={{ color: `var(--mantine-color-${col.color}-filled)` }}>{col.icon}</span>
                  <Text fw={700} size="sm">
                    {t(col.titleKey)}
                  </Text>
                  <Badge size="xs" color={col.color} variant="light">
                    {columnTasks.length}
                  </Badge>
                </Group>

                <Tooltip label={t('tasks.quickAdd')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={col.color}
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
                          opacity: isDragging ? 0.4 : 1,
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
                                <Badge size="xs" color={priorityColor} variant="filled" style={{ textTransform: 'capitalize' }}>
                                  {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
                                </Badge>
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

                                <Menu.Label>Move to</Menu.Label>
                                {COLUMNS.filter((targetCol) => targetCol.id !== task.status).map((targetCol) => (
                                  <Menu.Item
                                    key={targetCol.id}
                                    onClick={() => updateTaskStatus(task.filename, targetCol.id)}
                                    leftSection={targetCol.icon}
                                  >
                                    {t(targetCol.titleKey)}
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
                              textDecoration: task.status === 'done' ? 'line-through' : 'none',
                              color: task.status === 'done' ? 'var(--mantine-color-dimmed)' : 'inherit',
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
