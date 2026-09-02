import React, { useEffect, useState, useMemo } from 'react';
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
  useComputedColorScheme,
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
  IconTag,
  IconLayoutKanban,
  IconRefresh,
  IconArrowsMaximize,
  IconFolder,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig, TaskMeta, TaskPriority } from '../../types';
import { getColumnIcon, getColumnTitle } from '../kanban/columnUtils';
import {
  DEFAULT_AREAS,
  resolveTaskContext,
} from '../../utils/areaProjectUtils';

export const KanbanView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    tasks,
    isTasksLoading,
    openTaskModal,
    openTaskEditor,
    updateTaskStatus,
    deleteTask,
    refreshTasksList,
    settings,
    openSettings,
    allTags: storeAllTags,
    areas = DEFAULT_AREAS,
    projects = [],
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [contentSearchMatches, setContentSearchMatches] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
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
    return (task: TaskMeta) => {
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

  useEffect(() => {
    const query = search.trim();
    if (!query || !window.electronAPI?.searchTaskContents) {
      setContentSearchMatches(new Set());
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      const filenames = await window.electronAPI.searchTaskContents(query);
      if (isCurrent) setContentSearchMatches(new Set(filenames));
    }, 200);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const hideOld = settings?.hideCompletedOlderThan30Days ?? false;

    return tasks.filter((task) => {
      // Hide old completed/closed tasks if option is enabled and not manually revealed
      if (hideOld && isTaskOldClosed(task)) {
        return false;
      }

      // Search match
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesContent = contentSearchMatches.has(task.filename);
        const matchesTags = task.tags?.some((tag) => tag.toLowerCase().includes(query));
        const matchesArea = (task.area || '').toLowerCase().includes(query);
        const matchesProject = (task.project || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesTags && !matchesArea && !matchesProject) {
          return false;
        }
      }

      // Project filter
      const taskContext = resolveTaskContext(task, areas, projects, storeAllTags);
      if (selectedProject !== 'all') {
        if (!taskContext.project || taskContext.project.toLowerCase() !== selectedProject.toLowerCase()) {
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
  }, [tasks, search, contentSearchMatches, selectedProject, priorityFilter, tagFilter, settings?.hideCompletedOlderThan30Days, isTaskOldClosed, areas, projects, storeAllTags]);

  // Group tasks by column status
  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskMeta[]> = {};

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
  const handleDragStart = (e: React.DragEvent, task: TaskMeta) => {
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
      <Group justify="space-between" align="center" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: 'var(--mantine-primary-color-light)',
              color: 'var(--mantine-primary-color-filled)',
            }}
          >
            <IconLayoutKanban size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title order={3} style={{ letterSpacing: '-0.01em', fontSize: 18 }}>
              {t('tasks.title')}
            </Title>
            <Text size="xs" c="dimmed" truncate>
              {filteredTasks.length} {t('common.tasks').toLowerCase()} · {totalCompleted} {t('dashboard.completedCount', { count: totalCompleted }).toLowerCase()}
            </Text>
          </div>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Refresh tasks" withArrow>
            <ActionIcon
              variant="default"
              size="md"
              radius="md"
              onClick={() => refreshTasksList()}
              loading={isTasksLoading}
            >
              <IconRefresh size={15} />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="default"
            size="xs"
            radius="md"
            leftSection={<IconFolder size={14} />}
            onClick={() => openSettings('areas')}
          >
            {t('areas.title', 'Areas & Projects')}
          </Button>

          <Button
            variant="filled"
            color="primary"
            size="xs"
            leftSection={<IconPlus size={15} />}
            onClick={() => openTaskModal(null, visibleColumns[0]?.id || 'todo')}
            radius="md"
          >
            {t('tasks.newTask')}
          </Button>
        </Group>
      </Group>

      {/* Filter Bar */}
      <Paper p="xs" withBorder radius="md" style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
        <Group justify="space-between" gap="xs">
          <TextInput
            placeholder={t('tasks.searchPlaceholder')}
            leftSection={<IconSearch size={14} style={{ color: 'var(--app-sidebar-text-dimmed)' }} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius="md"
            size="xs"
            style={{ flex: '1 1 180px', minWidth: 150 }}
          />

          <Group gap="xs">
            {/* Project Filter */}
            <Select
              placeholder={t('dashboard.allProjects', 'All projects')}
              leftSection={<IconFolder size={13} />}
              value={selectedProject}
              onChange={(val) => val && setSelectedProject(val)}
              data={[
                { value: 'all', label: t('dashboard.allProjects', 'All projects') },
                ...projects.map((p) => ({ value: p.name, label: p.name })),
              ]}
              radius="md"
              size="xs"
              style={{ width: 160 }}
              allowDeselect={false}
            />

            {/* Priority Filter */}
            <Select
              placeholder={t('tasks.filterByPriority')}
              leftSection={<IconFilter size={13} />}
              value={priorityFilter}
              onChange={(val) => val && setPriorityFilter(val)}
              data={[
                { value: 'all', label: t('dashboard.allPriorities', 'All priorities') },
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

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <Select
                placeholder={t('tasks.filterByTag')}
                leftSection={<IconTag size={13} />}
                value={tagFilter}
                onChange={(val) => val && setTagFilter(val)}
                data={[
                  { value: 'all', label: t('dashboard.allTags', 'All tags') },
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
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          overflowY: 'hidden',
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
                  <span style={{ color: `var(--mantine-color-${col.color || 'blue'}-filled)` }}>
                    {getColumnIcon(col.iconName, 16)}
                  </span>
                  <Text fw={700} size="xs" truncate style={{ color: 'var(--app-text-primary)' }}>
                    {colTitle}
                  </Text>
                  <Text size="xs" c="dimmed">
                    ({columnTasks.length})
                  </Text>
                </Group>

                <Tooltip label={t('tasks.quickAdd')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    color="gray"
                    onClick={() => openTaskModal(null, col.id)}
                  >
                    <IconPlus size={14} />
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
                    const taskCtx = resolveTaskContext(task, areas, projects, storeAllTags);

                    // Visible tags and overflow
                    const taskTags = task.tags || [];
                    const visibleTags = taskTags.slice(0, 1);
                    const overflowTagsCount = taskTags.length - visibleTags.length;

                    return (
                      <Paper
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openTaskEditor(task)}
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
                        className="kanban-task-card"
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
                                  <Text size="xs" c="dimmed" fw={500} style={{ textTransform: 'capitalize', fontSize: 11 }}>
                                    {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
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
                                  onClick={() => openTaskEditor(task)}
                                >
                                  {t('tasks.openInFullEditor', 'Open in Full Editor')}
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconEdit size={14} />}
                                  onClick={() => openTaskModal(task)}
                                >
                                  {t('tasks.quickEdit', 'Quick Edit (Modal)')}
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
                                <Text size="xs" c="dimmed" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                  #{task.taskId ?? task.id}
                                </Text>
                              )}
                              <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                                · {task.due ? dayjs(task.due).format('D MMM') : (i18n.language === 'es' ? 'Sin fecha' : 'No date')}
                              </Text>
                            </Group>

                            <Group gap={4} wrap="nowrap">
                              {task.checklistTotal !== undefined && task.checklistTotal > 0 && (
                                <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                                  {task.checklistCompleted || 0}/{task.checklistTotal}
                                </Text>
                              )}

                              {visibleTags.map((tag: string) => (
                                <Badge key={tag} size="xs" variant="light" color="teal" radius="sm" style={{ fontSize: 10, padding: '0 4px' }}>
                                  #{tag}
                                </Badge>
                              ))}

                              {overflowTagsCount > 0 && (
                                <Badge size="xs" variant="subtle" color="gray" style={{ fontSize: 10, padding: '0 3px' }}>
                                  +{overflowTagsCount}
                                </Badge>
                              )}
                            </Group>
                          </Group>
                        </Stack>
                      </Paper>
                    );
                  })}

                  {/* Empty Column Placeholder */}
                  {columnTasks.length === 0 && (
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
                        onClick={() => openTaskModal(null, col.id)}
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
        })}
      </div>
    </div>
  );
};
