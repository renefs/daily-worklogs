import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Title,
  Text,
  Button,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconLayoutKanban,
  IconRefresh,
  IconFolder,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig, TaskMeta } from '../../types';
import { getColumnTitle } from '../kanban/columnUtils';
import { DEFAULT_AREAS, resolveTaskContext } from '../../utils/areaProjectUtils';
import { KanbanFilterBar } from '../kanban/KanbanFilterBar';
import { KanbanColumn } from '../kanban/KanbanColumn';
import classes from './KanbanView.module.css';

export const KanbanView: React.FC = () => {
  const { t } = useTranslation();

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
  } = useAppStoreSelector((state) => ({
    tasks: state.tasks,
    isTasksLoading: state.isTasksLoading,
    openTaskModal: state.openTaskModal,
    openTaskEditor: state.openTaskEditor,
    updateTaskStatus: state.updateTaskStatus,
    deleteTask: state.deleteTask,
    refreshTasksList: state.refreshTasksList,
    settings: state.settings,
    openSettings: state.openSettings,
    allTags: state.allTags,
    areas: state.areas,
    projects: state.projects,
  }));

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
    return tasks.filter((task) => {
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

      const taskContext = resolveTaskContext(task, areas, projects, storeAllTags);
      if (selectedProject !== 'all') {
        if (!taskContext.project || taskContext.project.toLowerCase() !== selectedProject.toLowerCase()) {
          return false;
        }
      }

      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }

      if (tagFilter !== 'all') {
        if (!task.tags || !task.tags.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [
    tasks,
    search,
    contentSearchMatches,
    selectedProject,
    priorityFilter,
    tagFilter,
    areas,
    projects,
    storeAllTags,
  ]);

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
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ filename: task.filename, status: task.status })
    );
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

  // undefined falls back to the 30-day default; null means "All"
  const closedWindowDays = settings?.closedTasksWindowDays === undefined ? 30 : settings.closedTasksWindowDays;

  const totalCompleted = useMemo(() => {
    return tasks.filter((t) => {
      const b = columnBehaviorMap.get(t.status) || t.status;
      return b === 'done' || b === 'cancelled';
    }).length;
  }, [tasks, columnBehaviorMap]);

  return (
    <div className={classes.container}>
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
              {filteredTasks.length} {t('common.tasks').toLowerCase()} · {totalCompleted}{' '}
              {t('dashboard.completedCount', { count: totalCompleted }).toLowerCase()}
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
      <KanbanFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        projects={projects}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        allTags={allTags}
      />

      {/* Kanban Board Columns Container */}
      <div className={classes.columnsContainer}>
        {visibleColumns.map((col) => {
          const columnTasks = tasksByColumn[col.id] || [];
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={columnTasks}
              closedWindowDays={closedWindowDays}
              isSearching={search.trim().length > 0}
              isTargeted={dragOverColumn === col.id}
              draggingTaskId={draggingTaskId}
              visibleColumns={visibleColumns}
              columnBehaviorMap={columnBehaviorMap}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onQuickAdd={(columnId) => openTaskModal(null, columnId)}
              onOpenEditor={openTaskEditor}
              onOpenModal={openTaskModal}
              onUpdateStatus={updateTaskStatus}
              onDeleteTask={deleteTask}
              areas={areas}
              projects={projects}
              storeAllTags={storeAllTags}
            />
          );
        })}
      </div>
    </div>
  );
};
