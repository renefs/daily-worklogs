import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_KANBAN_COLUMNS,
  KanbanColumnConfig,
  TaskItem,
  TaskPriority,
  TaskStatus,
  AreaDefinition,
  ProjectDefinition,
} from '../../types';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getProjectColor,
} from '../../utils/areaProjectUtils';

export interface UseTaskFormOptions {
  task: TaskItem | null;
  defaultStatus?: TaskStatus;
  kanbanColumns?: KanbanColumnConfig[];
  areas?: AreaDefinition[];
  projects?: ProjectDefinition[];
  onDirtyChange?: (isDirty: boolean) => void;
}

export function useTaskForm({
  task,
  defaultStatus = 'todo',
  kanbanColumns,
  areas = DEFAULT_AREAS,
  projects = [],
  onDirtyChange,
}: UseTaskFormOptions) {
  const { t, i18n } = useTranslation();

  const [title, setTitle] = useState('');
  const [area, setArea] = useState<string>('General');
  const [project, setProject] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startedDate, setStartedDate] = useState<Date | null>(null);
  const [completedDate, setCompletedDate] = useState<Date | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirtyState] = useState(false);

  const setIsDirty = useCallback(
    (dirty: boolean) => {
      setIsDirtyState(dirty);
      onDirtyChange?.(dirty);
    },
    [onDirtyChange]
  );

  const availableColumns = useMemo(() => {
    return kanbanColumns && kanbanColumns.length > 0
      ? kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;
  }, [kanbanColumns]);

  const currentStatusObj = useMemo(() => {
    return availableColumns.find((c) => c.id === status);
  }, [availableColumns, status]);

  const isClosed = useMemo(() => {
    const behavior = currentStatusObj?.behavior || status;
    return behavior === 'done' || behavior === 'cancelled';
  }, [currentStatusObj, status]);

  const currentAreaColor = useMemo(() => getAreaColor(area, areas), [area, areas]);
  const currentProjectColor = useMemo(
    () => getProjectColor(project || undefined, area, projects, areas),
    [project, area, projects, areas]
  );

  const initializedTaskKeyRef = useRef<string | null>(null);
  const taskIdentityKey = task
    ? task.filename || `${task.id || 'task'}:${task.title}`
    : 'new-task';

  // Synchronize state when the active task identity changes
  useEffect(() => {
    if (initializedTaskKeyRef.current === taskIdentityKey) {
      return;
    }
    initializedTaskKeyRef.current = taskIdentityKey;

    if (task) {
      setTitle(task.title || '');
      setArea(task.area || 'General');
      setProject(task.project || null);
      setStatus(task.status || defaultStatus || 'todo');
      setPriority(task.priority || 'medium');
      setDueDate(task.due ? new Date(task.due) : null);
      setStartedDate(task.startedDate ? new Date(task.startedDate) : null);
      setCompletedDate(task.completedDate ? new Date(task.completedDate) : null);
      setTags(task.tags || []);
      setContent(task.content || '');
      setIsDirty(false);
    } else {
      setTitle('');
      setArea('General');
      setProject(null);
      setStatus(defaultStatus || 'todo');
      setPriority('medium');
      setDueDate(null);
      setStartedDate(null);
      setCompletedDate(null);
      setTags([]);
      setContent('');
      setIsDirty(false);
    }
  }, [task, taskIdentityKey, defaultStatus, setIsDirty]);

  const handleStatusChange = useCallback(
    (newStatus: TaskStatus) => {
      setStatus(newStatus);
      setIsDirty(true);
      const today = new Date();
      const targetCol = availableColumns.find((c) => c.id === newStatus);
      const behavior = targetCol?.behavior || (newStatus === 'done' ? 'done' : newStatus === 'cancelled' ? 'cancelled' : 'todo');
      const isDoneOrCancelled = behavior === 'done' || behavior === 'cancelled';

      if (behavior === 'in_progress' && !startedDate) {
        setStartedDate(today);
      }
      if (isDoneOrCancelled && !completedDate) {
        setCompletedDate(today);
      } else if (!isDoneOrCancelled && completedDate) {
        setCompletedDate(null);
      }
    },
    [availableColumns, startedDate, completedDate, setIsDirty]
  );

  const handleToggleTaskInContent = useCallback(
    (taskText: string, checked: boolean) => {
      const cleanTaskText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      const pattern = new RegExp(`(-\\s*\\[)([ xX])(\\]\\s*${cleanTaskText})`, 'i');
      setContent((prev) => {
        const updated = prev.replace(pattern, (_match, p1, _p2, p3) => `${p1}${checked ? 'x' : ' '}${p3}`);
        if (updated !== prev) {
          setIsDirty(true);
        }
        return updated;
      });
    },
    [setIsDirty]
  );

  const taskStatsForEditor = useMemo(() => {
    const matches = content.match(/^[ \t]*-[ \t]+\[([ xX])\]/gm) || [];
    const totalCount = matches.length;
    const completedCount = matches.filter((m) => /\[[xX]\]/.test(m)).length;
    return { total: totalCount, completed: completedCount };
  }, [content]);

  const dateBadgeText = useMemo(() => {
    if (completedDate) {
      return `${t('tasks.completedDate')}: ${dayjs(completedDate).locale(i18n.language).format('D MMM YYYY')}`;
    }
    if (dueDate) {
      return `${t('tasks.dueDate')}: ${dayjs(dueDate).locale(i18n.language).format('D MMM YYYY')}`;
    }
    if (startedDate) {
      return `${t('tasks.startedDate')}: ${dayjs(startedDate).locale(i18n.language).format('D MMM')}`;
    }
    return null;
  }, [startedDate, completedDate, dueDate, i18n.language, t]);

  const draftSignature = JSON.stringify({
    title,
    area,
    project,
    status,
    priority,
    dueDate: dueDate?.toISOString() || null,
    startedDate: startedDate?.toISOString() || null,
    completedDate: completedDate?.toISOString() || null,
    tags,
    content,
  });

  const buildTaskPayload = useCallback(
    (currentTask?: TaskItem | null) => {
      const target = currentTask || task;
      const targetCreated = target?.created
        ? dayjs(target.created).isValid()
          ? dayjs(target.created).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');

      const targetDue = dueDate && dayjs(dueDate).isValid() ? dayjs(dueDate).format('YYYY-MM-DD') : undefined;
      const targetStarted = startedDate && dayjs(startedDate).isValid() ? dayjs(startedDate).format('YYYY-MM-DD') : undefined;
      const targetCompleted = completedDate && dayjs(completedDate).isValid() ? dayjs(completedDate).format('YYYY-MM-DD') : undefined;

      return {
        id: target?.id !== undefined && target?.id !== null && String(target.id).trim() ? String(target.id).trim() : undefined,
        taskId: typeof target?.taskId === 'number' ? target.taskId : undefined,
        filename: target?.filename && target.filename.trim() ? target.filename.trim() : undefined,
        title: title.trim(),
        area: area && area.trim() ? area.trim() : 'General',
        project: project && project.trim() ? project.trim() : undefined,
        status: status || 'todo',
        priority: priority || 'medium',
        created: targetCreated,
        due: targetDue,
        startedDate: targetStarted,
        completedDate: targetCompleted,
        tags: Array.isArray(tags) ? tags : [],
        parent: typeof target?.parent === 'number' ? target.parent : undefined,
        content: content || '',
      };
    },
    [task, title, area, project, status, priority, dueDate, startedDate, completedDate, tags, content]
  );

  return {
    title,
    setTitle,
    area,
    setArea,
    project,
    setProject,
    status,
    setStatus,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    startedDate,
    setStartedDate,
    completedDate,
    setCompletedDate,
    tags,
    setTags,
    content,
    setContent,
    isDirty,
    setIsDirty,
    availableColumns,
    currentStatusObj,
    isClosed,
    currentAreaColor,
    currentProjectColor,
    handleStatusChange,
    handleToggleTaskInContent,
    taskStatsForEditor,
    dateBadgeText,
    draftSignature,
    buildTaskPayload,
  };
}
