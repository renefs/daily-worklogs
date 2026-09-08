import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Group,
  SegmentedControl,
  Button,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Tooltip,
  Paper,
  Stack,
  TextInput,
  Menu,
  TagsInput,
  ScrollArea,
  Progress,
  Collapse,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconColumns,
  IconEye,
  IconWriting,
  IconCode,
  IconCheck,
  IconTrash,
  IconCalendar,
  IconTag,
  IconFlag,
  IconFolderOpen,
  IconClockPlay,
  IconClockCheck,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconCalendarPlus,
  IconDotsVertical,
  IconFileExport,
  IconListCheck,
  IconListTree,
  IconChevronDown,
  IconChevronRight,
  IconRotateClockwise,
  IconFolder,
  IconAlertCircle,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, TaskItem, TaskPriority, TaskStatus } from '../../types';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import { getColumnIcon, getColumnTitle } from '../kanban/columnUtils';
import { getTagColor } from '../../utils/tagUtils';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getProjectColor,
  resolveTaskContext,
} from '../../utils/areaProjectUtils';
import { registerTaskEditorFlush } from '../../services/editorSession';

export const TaskView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    activeTask,
    closeTaskEditor,
    createOrUpdateTask,
    deleteTask,
    logTaskToDailyNote,
    settings,
    allTags,
    areas = DEFAULT_AREAS,
    projects = [],
    taskEditorLayoutMode,
    setTaskEditorLayoutMode,
    isTaskPropertiesPanelOpen,
    toggleTaskPropertiesPanel,
    taskModalInitialStatus,
  } = useAppStoreSelector((state) => ({
    activeTask: state.activeTask,
    closeTaskEditor: state.closeTaskEditor,
    createOrUpdateTask: state.createOrUpdateTask,
    deleteTask: state.deleteTask,
    logTaskToDailyNote: state.logTaskToDailyNote,
    settings: state.settings,
    allTags: state.allTags,
    areas: state.areas,
    projects: state.projects,
    taskEditorLayoutMode: state.taskEditorLayoutMode,
    setTaskEditorLayoutMode: state.setTaskEditorLayoutMode,
    isTaskPropertiesPanelOpen: state.isTaskPropertiesPanelOpen,
    toggleTaskPropertiesPanel: state.toggleTaskPropertiesPanel,
    taskModalInitialStatus: state.taskModalInitialStatus,
  }));

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

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const persistedTaskRef = useRef<TaskItem | null>(activeTask);
  const initializedTaskKeyRef = useRef<string | null>(null);
  const failedDraftSignatureRef = useRef<string | null>(null);
  const taskSaveInFlightRef = useRef<Promise<TaskItem | null> | null>(null);
  const handleSaveRef = useRef<(options?: { showNotification?: boolean }) => Promise<TaskItem | null>>(
    async () => null
  );

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
  const latestDraftSignatureRef = useRef(draftSignature);
  latestDraftSignatureRef.current = draftSignature;

  useEffect(() => {
    if (taskSaveError && failedDraftSignatureRef.current !== draftSignature) {
      setTaskSaveError(null);
    }
  }, [draftSignature, taskSaveError]);

  // Inspector section collapse states
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isDatesOpen, setIsDatesOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const availableColumns = useMemo(() => {
    return settings?.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;
  }, [settings?.kanbanColumns]);

  const statusOptions = useMemo(() => {
    const opts = availableColumns.map((c) => ({
      value: c.id,
      label: getColumnTitle(c, t),
      color: c.color || 'blue',
      iconName: c.iconName,
      behavior: c.behavior,
    }));

    if (status && !opts.some((o) => o.value === status)) {
      opts.push({
        value: status,
        label: status,
        color: 'gray',
        iconName: 'circle-dot',
        behavior: 'todo',
      });
    }

    return opts;
  }, [availableColumns, status, t]);

  const availableProjectsForArea = useMemo(() => {
    const cleanArea = (area || '').toLowerCase().trim();
    if (!cleanArea) return projects;
    return projects.filter((p) => (p.areaName || '').toLowerCase() === cleanArea);
  }, [projects, area]);

  const resolvedInheritedContext = useMemo(() => {
    return resolveTaskContext(
      {
        area,
        project: project || undefined,
        tags,
      },
      areas,
      projects,
      allTags
    );
  }, [area, project, tags, areas, projects, allTags]);

  // Initialize or reset form from activeTask
  useEffect(() => {
    const initializationKey = activeTask?.filename || `new:${taskModalInitialStatus}`;
    if (initializedTaskKeyRef.current === initializationKey) return;
    initializedTaskKeyRef.current = initializationKey;
    persistedTaskRef.current = activeTask;
    if (activeTask) {
      const resolved = resolveTaskContext(activeTask, areas, projects, allTags);
      setTitle(activeTask.title || '');
      setArea(activeTask.area || resolved.area || 'General');
      setProject(activeTask.project || resolved.project || null);
      setStatus(activeTask.status || 'todo');
      setPriority(activeTask.priority || 'medium');
      setDueDate(activeTask.due ? dayjs(activeTask.due).toDate() : null);
      setStartedDate(activeTask.startedDate ? dayjs(activeTask.startedDate).toDate() : null);
      setCompletedDate(activeTask.completedDate ? dayjs(activeTask.completedDate).toDate() : null);
      setTags(activeTask.tags || []);
      setContent(activeTask.content || '');
      setIsDirty(false);
      setTaskSaveError(null);
    } else {
      const initialStatus = taskModalInitialStatus || availableColumns[0]?.id || 'todo';
      const targetCol = availableColumns.find((c) => c.id === initialStatus);
      const behavior = targetCol?.behavior || 'todo';

      setTitle('');
      setArea(areas[0]?.name || 'General');
      setProject(null);
      setStatus(initialStatus);
      setPriority('medium');
      setDueDate(null);
      setStartedDate(behavior === 'in_progress' ? new Date() : null);
      setCompletedDate(behavior === 'done' || behavior === 'cancelled' ? new Date() : null);
      setTags([]);
      setContent('');
      setIsDirty(false);
      setTaskSaveError(null);
    }
  }, [activeTask, taskModalInitialStatus, availableColumns, areas, projects, allTags]);

  // Calculate task checklist stats
  const checklistStats = useMemo(() => {
    const lines = (content || '').split('\n');
    const total = lines.filter((l) => /^\s*-\s*\[([ xX])\]/.test(l)).length;
    const completed = lines.filter((l) => /^\s*-\s*\[[xX]\]/.test(l)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [content]);

  // Extract document outline (Headings H1, H2, H3)
  const documentHeadings = useMemo(() => {
    const lines = (content || '').split('\n');
    const headings: { text: string; level: number; id: string }[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim().replace(/[*_`]/g, '');
        const id = text.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, '-').replace(/(^-|-$)/g, '');
        headings.push({ text, level, id });
      }
    });
    return headings;
  }, [content]);

  const handleStatusChange = (newStatus: TaskStatus) => {
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
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setIsDirty(true);
  };

  const handleToggleTaskInContent = (taskText: string, checked: boolean) => {
    const cleanTaskText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    const pattern = new RegExp(`(-\\s*\\[)([ xX])(\\]\\s*${cleanTaskText})`, 'i');
    const newContent = content.replace(pattern, (_match, p1, _p2, p3) => `${p1}${checked ? 'x' : ' '}${p3}`);
    if (newContent !== content) {
      setContent(newContent);
      setIsDirty(true);
    }
  };

  const handleSave = useCallback(async (options?: { showNotification?: boolean }) => {
    const existingSave = taskSaveInFlightRef.current;
    if (existingSave) {
      const result = await existingSave;
      if (taskSaveInFlightRef.current === existingSave) taskSaveInFlightRef.current = null;
      if (!result) return null;
      if (latestDraftSignatureRef.current !== draftSignature) {
        return handleSaveRef.current(options);
      }
      return result;
    }

    const savingDraftSignature = draftSignature;
    const identity = persistedTaskRef.current || activeTask;
    const trimmedTitle = title.trim() || identity?.title || t('tasks.untitledTask', 'Untitled Task');
    const saveOperation = (async (): Promise<TaskItem | null> => {
      setIsSaving(true);
      setTaskSaveError(null);
      try {
        const result = await createOrUpdateTask({
          id: identity?.id,
          taskId: identity?.taskId,
          filename: identity?.filename,
          title: trimmedTitle,
          status,
          priority,
          area: area.trim() || undefined,
          project: project ? project.trim() : undefined,
          due: dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : undefined,
          startedDate: startedDate ? dayjs(startedDate).format('YYYY-MM-DD') : undefined,
          completedDate: completedDate ? dayjs(completedDate).format('YYYY-MM-DD') : undefined,
          tags,
          content,
        });
        if (!result) throw new Error(t('tasks.errorSaving') || 'Failed to save task');

        persistedTaskRef.current = result;
        failedDraftSignatureRef.current = null;
        setIsDirty(latestDraftSignatureRef.current !== savingDraftSignature);
        if (options?.showNotification) {
          notifications.show({
            id: 'task-saved',
            title: t('tasks.taskSaved') || 'Task saved successfully!',
            message: result.title || trimmedTitle,
            color: 'teal',
            icon: <IconCheck size={16} />,
            autoClose: 2000,
          });
        }
        return result;
      } catch (err) {
        console.error('Failed to save task from TaskView:', err);
        const message = err instanceof Error ? err.message : t('tasks.errorSaving');
        failedDraftSignatureRef.current = savingDraftSignature;
        setTaskSaveError(message);
        setIsDirty(true);
        if (options?.showNotification) {
          notifications.show({
            id: 'task-save-error',
            title: t('common.error') || 'Error',
            message,
            color: 'red',
          });
        }
        return null;
      } finally {
        setIsSaving(false);
      }
    })();

    taskSaveInFlightRef.current = saveOperation;
    try {
      return await saveOperation;
    } finally {
      if (taskSaveInFlightRef.current === saveOperation) taskSaveInFlightRef.current = null;
    }
  }, [
    activeTask?.id,
    activeTask?.taskId,
    activeTask?.filename,
    activeTask?.title,
    title,
    status,
    priority,
    area,
    project,
    dueDate,
    startedDate,
    completedDate,
    tags,
    content,
    draftSignature,
    createOrUpdateTask,
    t,
  ]);
  handleSaveRef.current = handleSave;

  useEffect(() => registerTaskEditorFlush(async () => {
    if (!isDirty) return true;
    return Boolean(await handleSave({ showNotification: true }));
  }), [handleSave, isDirty]);

  // Autosave debounce timer
  useEffect(() => {
    if (!settings?.autoSave || !isDirty || isSaving || taskSaveError) return;
    const timer = setTimeout(() => {
      handleSave();
    }, settings.autoSaveDelay || 1000);
    return () => clearTimeout(timer);
  }, [isDirty, isSaving, taskSaveError, settings?.autoSave, settings?.autoSaveDelay, handleSave]);

  // Listen to global app save trigger (Cmd+S, File -> Save menu)
  useEffect(() => {
    const handleAppSave = () => {
      void handleSave({ showNotification: true });
    };
    window.addEventListener('app:save', handleAppSave);
    return () => {
      window.removeEventListener('app:save', handleAppSave);
    };
  }, [handleSave]);

  const handleLogToDaily = async () => {
    if (!activeTask && !title.trim()) return;
    setIsLogging(true);
    try {
      const taskToLog = activeTask || {
        id: 'new',
        filename: '',
        filepath: '',
        title: title.trim() || t('tasks.untitledTask', 'Untitled Task'),
        status,
        priority,
        created: dayjs().format('YYYY-MM-DD'),
        content,
      };

      const success = await logTaskToDailyNote(taskToLog);
      if (success) {
        notifications.show({
          title: t('tasks.taskLoggedToDaily'),
          message: title.trim() || activeTask?.title || '',
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err) {
      console.error('Failed to log task to note:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTask?.filename) {
      closeTaskEditor();
      return;
    }
    setIsSaving(true);
    try {
      await deleteTask(activeTask.filename);
      notifications.show({
        title: t('tasks.taskDeleted'),
        message: activeTask.title,
        color: 'red',
        icon: <IconTrash size={16} />,
      });
      setIsDeleteModalOpen(false);
      closeTaskEditor();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenFileInFileManager = () => {
    if (window.electronAPI && activeTask?.filepath) {
      window.electronAPI.openInFileManager(activeTask.filepath);
    }
  };

  const priorityOptions = [
    { value: 'low', label: t('tasks.priorityLow'), color: 'gray' },
    { value: 'medium', label: t('tasks.priorityMedium'), color: 'blue' },
    { value: 'high', label: t('tasks.priorityHigh'), color: 'orange' },
    { value: 'urgent', label: t('tasks.priorityUrgent'), color: 'red' },
  ];

  const currentStatusObj = statusOptions.find((o) => o.value === status);
  const currentPriorityObj = priorityOptions.find((p) => p.value === priority) || priorityOptions[1];
  const currentAreaColor = getAreaColor(area, areas);
  const currentProjectColor = project ? getProjectColor(project, area, projects, areas) : 'gray';

  const isCompleted = currentStatusObj?.behavior === 'done' || status === 'done' || status === 'completed';
  const isCancelled = currentStatusObj?.behavior === 'cancelled' || status === 'cancelled';
  const isClosed = isCompleted || isCancelled;

  // Jump to TOC heading
  const handleScrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Format date range for metadata strip
  const dateRangeStr = useMemo(() => {
    if (startedDate && completedDate) {
      const s = dayjs(startedDate).locale(i18n.language).format('D MMM');
      const c = dayjs(completedDate).locale(i18n.language).format('D MMM');
      return `${s} – ${c}`;
    }
    if (completedDate) {
      return `${t('tasks.completedOn', { date: dayjs(completedDate).locale(i18n.language).format('D MMM YYYY') })}`;
    }
    if (dueDate) {
      return `${t('tasks.dueDate')}: ${dayjs(dueDate).locale(i18n.language).format('D MMM YYYY')}`;
    }
    if (startedDate) {
      return `${t('tasks.startedDate')}: ${dayjs(startedDate).locale(i18n.language).format('D MMM')}`;
    }
    return null;
  }, [startedDate, completedDate, dueDate, i18n.language, t]);

  return (
    <div className="task-view-container">
      {/* Compact task header: title first, supporting controls second */}
      <div className="task-header-unified">
        <div className="task-header-primary">
          <div className="task-header-title-group">
            <Tooltip label={t('tasks.backToTasks')} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                onClick={() => {
                  void (async () => {
                    if (isDirty && !await handleSave({ showNotification: true })) return;
                    closeTaskEditor();
                  })();
                }}
                radius="md"
                aria-label={t('tasks.backToTasks')}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>

            {activeTask && (activeTask.taskId !== undefined || activeTask.id) && (
              <Tooltip
                label={
                  <div style={{ textAlign: 'center' }}>
                    <Text size="xs" fw={700}>#{activeTask.taskId ?? activeTask.id}</Text>
                    {activeTask.filename && <Text size="xs" c="dimmed">{activeTask.filename}</Text>}
                  </div>
                }
                withArrow
              >
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="sm"
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'default',
                  }}
                >
                  #{activeTask.taskId ?? activeTask.id}
                </Badge>
              </Tooltip>
            )}

            {/* Task Title Input */}
            <TextInput
              value={title}
              onChange={(e) => {
                setTitle(e.currentTarget.value);
                setIsDirty(true);
              }}
              placeholder={t('tasks.titlePlaceholder', 'What needs to be done?')}
              variant="unstyled"
              className="task-title-input"
              styles={{
                input: {
                  fontSize: 20,
                  fontWeight: 750,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-display)',
                  color: isDark ? 'var(--mantine-color-white)' : 'var(--mantine-color-dark-9)',
                  padding: '2px 4px',
                  height: 'auto',
                  textDecoration: isClosed ? 'line-through' : 'none',
                  opacity: isClosed ? 0.85 : 1,
                },
              }}
            />
          </div>

          <Group gap={6} wrap="nowrap" className="task-header-primary-actions">
            {/* Save status stays visible without competing with the title. */}
            {taskSaveError ? (
              <Button
                variant="subtle"
                color="red"
                size="compact-xs"
                leftSection={<IconAlertCircle size={14} />}
                onClick={() => void handleSave({ showNotification: true })}
              >
                {t('editor.retrySave')}
              </Button>
            ) : isSaving ? (
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {t('editor.saving')}
              </Text>
            ) : isDirty ? (
              <Badge color="yellow" variant="light" size="xs">
                {t('editor.unsaved')}
              </Badge>
            ) : (
              <Tooltip label={t('editor.saved')} withArrow>
                <span className="task-save-indicator">
                  <IconCheck size={16} stroke={2.2} />
                </span>
              </Tooltip>
            )}

            <Tooltip label={t('tasks.toggleProperties')} withArrow>
              <ActionIcon
                aria-label={t('tasks.toggleProperties')}
                variant={isTaskPropertiesPanelOpen ? 'light' : 'subtle'}
                color={isTaskPropertiesPanelOpen ? 'primary' : 'gray'}
                size="md"
                radius="md"
                onClick={toggleTaskPropertiesPanel}
              >
                {isTaskPropertiesPanelOpen ? (
                  <IconLayoutSidebarRightCollapse size={17} />
                ) : (
                  <IconLayoutSidebarRight size={17} />
                )}
              </ActionIcon>
            </Tooltip>

            {/* 3-Dots More Actions Menu */}
            <Menu position="bottom-end" shadow="md" width={200} withinPortal>
              <Menu.Target>
                <ActionIcon
                  aria-label={t('tasks.moreActions')}
                  variant="subtle"
                  size="md"
                  color="gray"
                  radius="md"
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconCalendarPlus size={15} />} onClick={handleLogToDaily} disabled={isLogging}>
                  {t('tasks.logToDailyNote')}
                </Menu.Item>
                <Menu.Item leftSection={<IconFileExport size={15} />} onClick={() => setIsExportModalOpen(true)}>
                  {t('editor.exportNote')}
                </Menu.Item>
                {window.electronAPI && activeTask?.filepath && (
                  <Menu.Item leftSection={<IconFolderOpen size={15} />} onClick={handleOpenFileInFileManager}>
                    {t('tasks.openInFileManager')}
                  </Menu.Item>
                )}
                {isCompleted ? (
                  <Menu.Item leftSection={<IconRotateClockwise size={15} />} onClick={() => handleStatusChange(availableColumns[0]?.id || 'todo')}>
                    {t('tasks.reopenTask', 'Reopen Task')}
                  </Menu.Item>
                ) : (
                  <Menu.Item leftSection={<IconCheck size={15} />} color="teal" onClick={() => handleStatusChange('done')}>
                    {t('tasks.markAsCompleted', 'Mark as Done')}
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setIsDeleteModalOpen(true)}>
                  {t('tasks.deleteTask')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </div>

        <div className="task-header-secondary">
          <div className="task-metadata-strip">
            {/* Quick Contextual Status Badge / Reopen Action */}
            {isClosed ? (
              <Button
                variant="light"
                color={isCompleted ? 'teal' : 'red'}
                size="xs"
                radius="md"
                leftSection={<IconRotateClockwise size={14} />}
                onClick={() => handleStatusChange(availableColumns[0]?.id || 'todo')}
              >
                {t('tasks.reopenTask', 'Reopen Task')}
              </Button>
            ) : (
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <Button
                    variant="light"
                    color={currentStatusObj?.color || 'blue'}
                    size="xs"
                    radius="md"
                    leftSection={
                      <span style={{ color: `var(--mantine-color-${currentStatusObj?.color || 'blue'}-filled)` }}>
                        {getColumnIcon(currentStatusObj?.iconName, 14)}
                      </span>
                    }
                    rightSection={<IconChevronDown size={12} />}
                  >
                    {currentStatusObj?.label || status}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t('tasks.moveTo')}</Menu.Label>
                  {statusOptions.map((opt) => (
                    <Menu.Item
                      key={opt.value}
                      leftSection={
                        <span style={{ color: `var(--mantine-color-${opt.color || 'blue'}-filled)` }}>
                          {getColumnIcon(opt.iconName, 14)}
                        </span>
                      }
                      onClick={() => handleStatusChange(opt.value as TaskStatus)}
                    >
                      {opt.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}

            <span className="task-metadata-separator">•</span>
            <span className="task-metadata-item">
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: `var(--mantine-color-${currentPriorityObj.color}-filled)` }} />
              <Text size="xs" c="dimmed">{currentPriorityObj.label}</Text>
            </span>

            {area && (
              <>
                <span className="task-metadata-separator">•</span>
                <span className="task-metadata-item">
                  <IconFolder size={13} style={{ color: `var(--mantine-color-${currentAreaColor}-filled)` }} />
                  <Text size="xs" fw={500} style={{ color: 'var(--app-text-secondary)' }}>{area}</Text>
                </span>
              </>
            )}

            {project && <Badge size="xs" color={currentProjectColor} variant="light" radius="sm">{project}</Badge>}
            {dateRangeStr && (
              <span className="task-metadata-item">
                <IconCalendar size={13} />
                <Text size="xs" c="dimmed">{dateRangeStr}</Text>
              </span>
            )}
            {resolvedInheritedContext.allEffectiveTags.length > 0 && (
              <Group gap={2} wrap="nowrap" className="task-header-tags">
                {resolvedInheritedContext.allEffectiveTags.slice(0, 2).map((tag) => (
                  <Badge key={tag} size="xs" color="gray" variant="subtle">#{tag}</Badge>
                ))}
                {resolvedInheritedContext.allEffectiveTags.length > 2 && <Text size="xs" c="dimmed">+{resolvedInheritedContext.allEffectiveTags.length - 2}</Text>}
              </Group>
            )}
          </div>

          <div className="task-header-view-modes">
            <SegmentedControl
              value={taskEditorLayoutMode}
              onChange={(val) => setTaskEditorLayoutMode(val as 'live' | 'split' | 'edit' | 'preview')}
              size="xs"
              radius="md"
              transitionDuration={180}
              className="nav-segmented-control"
              data={[
                {
                  value: 'live',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconWriting size={14} />
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{t('editor.live')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'split',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconColumns size={14} />
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{t('editor.split')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'edit',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconCode size={14} />
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{t('editor.write')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'preview',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <IconEye size={14} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{t('editor.preview')}</span>
                    </Group>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: EDITOR/VIEWER + COMPACT INSPECTOR */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, overflow: 'hidden' }}>
        {/* Document Editor / Viewer */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', gap: 10 }}>
          <div
            style={{
              display: taskEditorLayoutMode === 'preview' ? 'none' : 'block',
              flex: 1,
              minWidth: 0,
              height: '100%',
            }}
          >
            <MarkdownEditor
              isLivePreview={taskEditorLayoutMode === 'live'}
              content={content}
              onChange={handleContentChange}
              onSave={handleSave}
              isSaving={isSaving}
              isDirty={isDirty}
              showTemplates={false}
              showStatusAndActions={false}
              placeholder={t('tasks.descriptionPlaceholder')}
              tasksStats={checklistStats}
              onExportClick={() => setIsExportModalOpen(true)}
              onDeleteClick={() => setIsDeleteModalOpen(true)}
            />
          </div>

          {(taskEditorLayoutMode === 'split' || taskEditorLayoutMode === 'preview') && (
            <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
              <MarkdownViewer
                content={content || `_${t('tasks.noDescriptionProvided')}_`}
                allowToggleTasks={true}
                onToggleTask={handleToggleTaskInContent}
              />
            </div>
          )}
        </div>

        {/* 4. COMPACT PROPERTIES INSPECTOR PANEL */}
        {isTaskPropertiesPanelOpen && (
          <div className="task-inspector-panel">
            {/* Inspector Header */}
            <div className="task-inspector-header">
              <Group gap={6} align="center">
                <Text fw={700} size="xs" style={{ letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {t('tasks.inspector', 'Inspector')}
                </Text>
                {activeTask && (activeTask.taskId !== undefined || activeTask.id) && (
                  <Badge size="xs" variant="dot" color={currentStatusObj?.color || 'blue'}>
                    #{activeTask.taskId ?? activeTask.id}
                  </Badge>
                )}
              </Group>

              <ActionIcon
                aria-label={t('tasks.toggleProperties')}
                variant="subtle"
                size="xs"
                color="gray"
                onClick={toggleTaskPropertiesPanel}
              >
                <IconLayoutSidebarRightCollapse size={14} />
              </ActionIcon>
            </div>

            <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
              {/* Checklist Progress Card (if checklist items exist) */}
              {checklistStats.total > 0 && (
                <div className="task-inspector-section" style={{ backgroundColor: isDark ? 'rgba(32, 201, 151, 0.05)' : 'rgba(32, 201, 151, 0.04)' }}>
                  <Stack gap={6}>
                    <Group justify="space-between" align="center">
                      <Group gap={5}>
                        <IconListCheck size={14} style={{ color: 'var(--mantine-color-teal-filled)' }} />
                        <Text size="xs" fw={600} style={{ color: 'var(--app-text-primary)' }}>
                          {t('tasks.checklistProgress', 'Checklist Progress')}
                        </Text>
                      </Group>
                      <Badge size="xs" color="teal" variant="light">
                        {checklistStats.percent}%
                      </Badge>
                    </Group>
                    <Progress value={checklistStats.percent} color="teal" size="sm" radius="xl" animated={checklistStats.percent < 100 && checklistStats.percent > 0} />
                    <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                      {t('tasks.stepsCompleted', {
                        completed: checklistStats.completed,
                        total: checklistStats.total,
                        percent: checklistStats.percent,
                      })}
                    </Text>
                  </Stack>
                </div>
              )}

              {/* General Properties (Always Compact & Accessible) */}
              <div className="task-inspector-section">
                <Stack gap={6}>
                  {/* Status Row */}
                  <div className="task-inspector-row">
                    <span className="task-inspector-key">
                      {getColumnIcon(currentStatusObj?.iconName, 14)}
                      <span>{t('tasks.statusBacklog', 'Status')}</span>
                    </span>
                    <Menu shadow="md" width={170} position="bottom-end">
                      <Menu.Target>
                        <UnstyledButton className="task-inspector-val">
                          <Badge size="xs" color={currentStatusObj?.color || 'blue'} variant="light" style={{ cursor: 'pointer' }}>
                            {currentStatusObj?.label || status} ▾
                          </Badge>
                        </UnstyledButton>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {statusOptions.map((opt) => (
                          <Menu.Item
                            key={opt.value}
                            leftSection={
                              <span style={{ color: `var(--mantine-color-${opt.color || 'blue'}-filled)` }}>
                                {getColumnIcon(opt.iconName, 14)}
                              </span>
                            }
                            onClick={() => handleStatusChange(opt.value as TaskStatus)}
                          >
                            {opt.label}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>

                  {/* Priority Row */}
                  <div className="task-inspector-row">
                    <span className="task-inspector-key">
                      <IconFlag size={14} />
                      <span>{t('tasks.priority')}</span>
                    </span>
                    <Menu shadow="md" width={150} position="bottom-end">
                      <Menu.Target>
                        <UnstyledButton className="task-inspector-val">
                          <Group gap={4} wrap="nowrap" style={{ cursor: 'pointer' }}>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                backgroundColor: `var(--mantine-color-${currentPriorityObj.color}-filled)`,
                              }}
                            />
                            <Text size="xs" fw={600} style={{ color: 'var(--app-text-primary)' }}>
                              {currentPriorityObj.label} ▾
                            </Text>
                          </Group>
                        </UnstyledButton>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {priorityOptions.map((p) => (
                          <Menu.Item
                            key={p.value}
                            leftSection={
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: `var(--mantine-color-${p.color}-filled)`,
                                  display: 'inline-block',
                                }}
                              />
                            }
                            onClick={() => {
                              setPriority(p.value as TaskPriority);
                              setIsDirty(true);
                            }}
                          >
                            {p.label}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>

                  {/* Area Row */}
                  <div className="task-inspector-row">
                    <span className="task-inspector-key">
                      <IconFolder size={14} />
                      <span>{t('areas.areaLabel', 'Area')}</span>
                    </span>
                    <Menu shadow="md" width={180} position="bottom-end">
                      <Menu.Target>
                        <UnstyledButton className="task-inspector-val">
                          <Badge size="xs" color={currentAreaColor} variant="filled" style={{ cursor: 'pointer' }}>
                            {area} ▾
                          </Badge>
                        </UnstyledButton>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {areas.map((a) => (
                          <Menu.Item
                            key={a.name}
                            leftSection={
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: `var(--mantine-color-${getAreaColor(a.name, areas)}-filled)`,
                                  display: 'inline-block',
                                }}
                              />
                            }
                            onClick={() => {
                              setArea(a.name);
                              setIsDirty(true);
                              if (project) {
                                const projMatches = projects.some(
                                  (p) => p.name.toLowerCase() === project.toLowerCase() && (p.areaName || '').toLowerCase() === a.name.toLowerCase()
                                );
                                if (!projMatches) setProject(null);
                              }
                            }}
                          >
                            {a.name}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>

                  {/* Project Row */}
                  <div className="task-inspector-row">
                    <span className="task-inspector-key">
                      <IconTag size={14} />
                      <span>{t('areas.projectLabel', 'Project')}</span>
                    </span>
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <UnstyledButton className="task-inspector-val">
                          {project ? (
                            <Badge size="xs" color={currentProjectColor} variant="light" style={{ cursor: 'pointer' }}>
                              {project} ▾
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}>
                              {t('areas.noProject', 'None')} ▾
                            </Text>
                          )}
                        </UnstyledButton>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => { setProject(null); setIsDirty(true); }}>
                          <Text size="xs" c="dimmed">{t('areas.noProject', 'None (Direct Area task)')}</Text>
                        </Menu.Item>
                        {availableProjectsForArea.map((p) => (
                          <Menu.Item
                            key={p.name}
                            leftSection={
                              <Badge size="xs" color={getProjectColor(p.name, area, projects, areas)} variant="dot">
                                {p.name}
                              </Badge>
                            }
                            onClick={() => {
                              setProject(p.name);
                              setIsDirty(true);
                            }}
                          >
                            {p.name}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </Stack>
              </div>

              {/* Schedule & Dates Collapsible Section */}
              <div className="task-inspector-section">
                <UnstyledButton
                  onClick={() => setIsDatesOpen(!isDatesOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDatesOpen ? 8 : 0 }}
                >
                  <Group gap={6}>
                    <IconCalendar size={14} style={{ color: 'var(--app-text-secondary)' }} />
                    <Text size="xs" fw={700} style={{ letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--app-text-secondary)' }}>
                      {t('tasks.sectionSchedule', 'Dates & Planning')}
                    </Text>
                  </Group>
                  {isDatesOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                </UnstyledButton>

                <Collapse in={isDatesOpen}>
                  <Stack gap={8} mt={4}>
                    <DatePickerInput
                      label={t('tasks.dueDate')}
                      placeholder={t('tasks.noDueDate')}
                      value={dueDate}
                      onChange={(val) => {
                        setDueDate(val);
                        setIsDirty(true);
                      }}
                      leftSection={<IconCalendar size={14} />}
                      clearable
                      size="xs"
                      radius="md"
                    />

                    <DatePickerInput
                      label={t('tasks.startedDate')}
                      placeholder={t('tasks.noStartedDate')}
                      value={startedDate}
                      onChange={(val) => {
                        setStartedDate(val);
                        setIsDirty(true);
                      }}
                      leftSection={<IconClockPlay size={14} />}
                      clearable
                      size="xs"
                      radius="md"
                    />

                    <DatePickerInput
                      label={t('tasks.completedDate')}
                      placeholder={t('tasks.noCompletedDate')}
                      value={completedDate}
                      onChange={(val) => {
                        setCompletedDate(val);
                        setIsDirty(true);
                      }}
                      leftSection={<IconClockCheck size={14} />}
                      clearable
                      size="xs"
                      radius="md"
                    />
                  </Stack>
                </Collapse>
              </div>

              {/* Context & Tags Collapsible Section */}
              <div className="task-inspector-section">
                <UnstyledButton
                  onClick={() => setIsTagsOpen(!isTagsOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isTagsOpen ? 8 : 0 }}
                >
                  <Group gap={6}>
                    <IconTag size={14} style={{ color: 'var(--app-text-secondary)' }} />
                    <Text size="xs" fw={700} style={{ letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--app-text-secondary)' }}>
                      {t('tasks.contextTags', 'Context & Tags')}
                    </Text>
                  </Group>
                  {isTagsOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                </UnstyledButton>

                <Collapse in={isTagsOpen}>
                  <Stack gap={8} mt={4}>
                    {/* Inherited tags */}
                    {resolvedInheritedContext.inheritedTags.length > 0 && (
                      <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: isDark ? 'rgba(76, 110, 245, 0.05)' : 'rgba(76, 110, 245, 0.03)' }}>
                        <Group gap={4} wrap="wrap">
                          {resolvedInheritedContext.inheritedTags.map((tg) => (
                            <Badge key={tg} size="xs" color={currentAreaColor} variant="dot">
                              #{tg}
                            </Badge>
                          ))}
                        </Group>
                      </Paper>
                    )}

                    <TagsInput
                      placeholder={t('tasks.addTagPlaceholder')}
                      value={tags}
                      onChange={(val) => {
                        setTags(val);
                        setIsDirty(true);
                      }}
                      data={allTags.map((t) => t.name)}
                      clearable
                      size="xs"
                      radius="md"
                      renderOption={({ option }) => {
                        const tagColor = getTagColor(option.value, allTags);
                        return (
                          <Badge size="xs" color={tagColor} variant="light">
                            #{option.value}
                          </Badge>
                        );
                      }}
                    />
                  </Stack>
                </Collapse>
              </div>

              {/* Document Outline / Table of Contents */}
              <div className="task-inspector-section">
                <UnstyledButton
                  onClick={() => setIsOutlineOpen(!isOutlineOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOutlineOpen ? 8 : 0 }}
                >
                  <Group gap={6}>
                    <IconListTree size={14} style={{ color: 'var(--app-text-secondary)' }} />
                    <Text size="xs" fw={700} style={{ letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--app-text-secondary)' }}>
                      {t('tasks.outline', 'Outline')} ({documentHeadings.length})
                    </Text>
                  </Group>
                  {isOutlineOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                </UnstyledButton>

                <Collapse in={isOutlineOpen}>
                  {documentHeadings.length > 0 ? (
                    <Stack gap={2} mt={4}>
                      {documentHeadings.map((h, idx) => (
                        <button
                          key={`${h.id}-${idx}`}
                          type="button"
                          className={`task-toc-item level-${h.level}`}
                          onClick={() => handleScrollToHeading(h.id)}
                        >
                          <span style={{ opacity: 0.5, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                            {'#'.repeat(h.level)}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.text}
                          </span>
                        </button>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed" py={4} fs="italic">
                      {t('tasks.noHeadings', 'No headings in document')}
                    </Text>
                  )}
                </Collapse>
              </div>

              {/* Actions & Storage Collapsible Section */}
              <div className="task-inspector-section" style={{ borderBottom: 'none' }}>
                <UnstyledButton
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isActionsOpen ? 8 : 0 }}
                >
                  <Group gap={6}>
                    <Text size="xs" fw={700} style={{ letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--app-text-secondary)' }}>
                      {t('tasks.sectionActions', 'Actions & Storage')}
                    </Text>
                  </Group>
                  {isActionsOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                </UnstyledButton>

                <Collapse in={isActionsOpen}>
                  <Stack gap={6} mt={4}>
                    <Button
                      variant="light"
                      color="blue"
                      size="xs"
                      radius="md"
                      leftSection={<IconCalendarPlus size={14} />}
                      loading={isLogging}
                      onClick={handleLogToDaily}
                    >
                      {t('tasks.logToDailyNote')}
                    </Button>

                    <Button
                      variant="default"
                      size="xs"
                      radius="md"
                      leftSection={<IconFileExport size={14} />}
                      onClick={() => setIsExportModalOpen(true)}
                    >
                      {t('editor.exportNote')}
                    </Button>

                    {window.electronAPI && activeTask?.filepath && (
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        radius="md"
                        leftSection={<IconFolderOpen size={14} />}
                        onClick={handleOpenFileInFileManager}
                      >
                        {t('tasks.openInFileManager')}
                      </Button>
                    )}

                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      radius="md"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      {t('tasks.deleteTask')}
                    </Button>
                  </Stack>
                </Collapse>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('tasks.deleteTask')}
        centered
        radius="md"
      >
        <Text size="sm" mb="lg">
          {t('tasks.deleteConfirm', {
            title: title || activeTask?.title || 'this task',
            filename: activeTask?.filename || '',
          })}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setIsDeleteModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button color="red" onClick={handleDelete} loading={isSaving}>
            {t('common.delete')}
          </Button>
        </Group>
      </Modal>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Task - ${title || activeTask?.title || 'Untitled'}`}
          content={`# ${title || activeTask?.title || 'Untitled'}\n\n**Status:** ${status}\n**Priority:** ${priority}\n**Area:** ${area}${project ? `\n**Project:** ${project}` : ''}\n\n${content}`}
          defaultFileName={`task-${activeTask?.filename ? activeTask.filename.replace(/\.md$/, '') : dayjs().format('YYYY-MM-DD')}`}
        />
      )}
    </div>
  );
};
