import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Group,
  SegmentedControl,
  Button,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Grid,
  Tooltip,
  Paper,
  Stack,
  TextInput,
  Select,
  TagsInput,
  ScrollArea,
  Divider,
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
  IconDeviceFloppy,
  IconCalendar,
  IconTag,
  IconFlag,
  IconFolderOpen,
  IconClockPlay,
  IconClockCheck,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconCalendarPlus,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, TaskPriority, TaskStatus } from '../../types';
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

export const TaskView: React.FC = () => {
  const { t } = useTranslation();
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
  } = useAppStore();

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
  const [isLogging, setIsLogging] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    }
  }, [activeTask, taskModalInitialStatus, availableColumns, areas, projects, allTags]);

  // Calculate task checklist stats
  const checklistStats = useMemo(() => {
    const lines = (content || '').split('\n');
    const total = lines.filter((l) => /^\s*-\s*\[([ xX])\]/.test(l)).length;
    const completed = lines.filter((l) => /^\s*-\s*\[[xX]\]/.test(l)).length;
    return { total, completed };
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

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim() || activeTask?.title || t('tasks.untitledTask', 'Untitled Task');
    setIsSaving(true);
    try {
      const formattedDue = dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : undefined;
      const formattedStarted = startedDate ? dayjs(startedDate).format('YYYY-MM-DD') : undefined;
      const formattedCompleted = completedDate ? dayjs(completedDate).format('YYYY-MM-DD') : undefined;

      const result = await createOrUpdateTask({
        id: activeTask?.id,
        taskId: activeTask?.taskId,
        filename: activeTask?.filename,
        title: trimmedTitle,
        status,
        priority,
        area: area.trim() || undefined,
        project: project ? project.trim() : undefined,
        due: formattedDue,
        startedDate: formattedStarted,
        completedDate: formattedCompleted,
        tags,
        content,
      });

      if (result) {
        setIsDirty(false);
      }
      return result;
    } catch (err) {
      console.error('Failed to save task from TaskView:', err);
      return null;
    } finally {
      setIsSaving(false);
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
    createOrUpdateTask,
    t,
  ]);

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
  const currentAreaColor = getAreaColor(area, areas);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12, overflow: 'hidden' }}>
      {/* Sub-Header: Back Button, Title, Fast Selectors & Layout Switcher */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        {/* Left Side: Back button + Task ID */}
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={t('tasks.backToTasks', 'Back')} withArrow>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => {
                if (isDirty) {
                  handleSave();
                }
                closeTaskEditor();
              }}
              radius="md"
              style={{ flexShrink: 0 }}
            >
              {t('tasks.backToTasks', 'Back')}
            </Button>
          </Tooltip>

          {/* GitHub-style Task ID badge */}
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
                size="md"
                style={{
                  flexShrink: 0,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'default',
                }}
              >
                #{activeTask.taskId ?? activeTask.id}
              </Badge>
            </Tooltip>
          )}
        </Group>

        {/* Right Side: Quick Status/Priority Badges, Layout Switcher & Actions */}
        <Group gap="xs" wrap="nowrap">
          {/* Layout Mode Switcher (Live, Split, Edit, Preview) */}
          <SegmentedControl
            value={taskEditorLayoutMode}
            onChange={(val) => setTaskEditorLayoutMode(val as any)}
            size="xs"
            radius="md"
            transitionDuration={180}
            className="nav-segmented-control"
            data={[
              {
                value: 'live',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconWriting size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.live')}</span>
                  </Group>
                ),
              },
              {
                value: 'split',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconColumns size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.split')}</span>
                  </Group>
                ),
              },
              {
                value: 'edit',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconCode size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.write')}</span>
                  </Group>
                ),
              },
              {
                value: 'preview',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconEye size={15} stroke={1.8} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t('editor.preview')}</span>
                  </Group>
                ),
              },
            ]}
          />

          {/* Save Status & Button */}
          {isDirty ? (
            <Badge color="yellow" variant="light" size="sm">
              {t('editor.unsaved')}
            </Badge>
          ) : isSaving ? (
            <Badge color="blue" variant="light" size="sm">
              {t('editor.saving')}
            </Badge>
          ) : (
            <Badge color="green" variant="subtle" size="sm" leftSection={<IconCheck size={12} />}>
              {t('editor.saved')}
            </Badge>
          )}

          <Tooltip label={t('common.save')} withArrow>
            <ActionIcon
              variant={isDirty ? 'filled' : 'light'}
              color="primary"
              size="md"
              radius="md"
              onClick={handleSave}
              loading={isSaving}
            >
              <IconDeviceFloppy size={18} />
            </ActionIcon>
          </Tooltip>

          {/* Properties Panel Toggle */}
          <Tooltip label={t('tasks.toggleProperties', 'Task Properties')} withArrow>
            <Button
              variant={isTaskPropertiesPanelOpen ? 'light' : 'default'}
              size="xs"
              radius="md"
              leftSection={
                isTaskPropertiesPanelOpen ? (
                  <IconLayoutSidebarRightCollapse size={15} />
                ) : (
                  <IconLayoutSidebarRight size={15} />
                )
              }
              onClick={toggleTaskPropertiesPanel}
            >
              {t('tasks.properties', 'Properties')}
            </Button>
          </Tooltip>
        </Group>
      </Group>

      {/* Main Area: Full-space Editor / Viewer + Right-side Properties Panel */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
        {/* Left / Main Workspace: Markdown Editor / Viewer */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Document Title Header */}
          <div style={{ padding: '0 2px' }}>
            {taskEditorLayoutMode === 'preview' ? (
              <Text
                fw={800}
                style={{
                  fontSize: 22,
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-display)',
                  padding: '2px 4px',
                  color: isDark ? 'var(--mantine-color-white)' : 'var(--mantine-color-dark-9)',
                }}
              >
                {title || t('tasks.untitledTask', 'Untitled Task')}
              </Text>
            ) : (
              <TextInput
                value={title}
                onChange={(e) => {
                  setTitle(e.currentTarget.value);
                  setIsDirty(true);
                }}
                placeholder={t('tasks.titlePlaceholder', 'Task Title')}
                variant="unstyled"
                styles={{
                  input: {
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-display)',
                    padding: '2px 4px',
                    height: 'auto',
                    color: isDark ? 'var(--mantine-color-white)' : 'var(--mantine-color-dark-9)',
                  },
                }}
              />
            )}
          </div>

          {/* Editor / Viewer based on layout mode */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {taskEditorLayoutMode === 'live' && (
              <div style={{ height: '100%' }}>
                <MarkdownEditor
                  isLivePreview={true}
                  content={content}
                  onChange={handleContentChange}
                  onSave={handleSave}
                  isSaving={isSaving}
                  isDirty={isDirty}
                  showTemplates={false}
                  placeholder={t('tasks.descriptionPlaceholder')}
                  tasksStats={checklistStats}
                  onExportClick={() => setIsExportModalOpen(true)}
                  onDeleteClick={() => setIsDeleteModalOpen(true)}
                />
              </div>
            )}

            {taskEditorLayoutMode === 'split' && (
              <Grid style={{ height: '100%' }} gutter="md">
                <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '100%' }}>
                  <MarkdownEditor
                    isLivePreview={false}
                    content={content}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    isSaving={isSaving}
                    isDirty={isDirty}
                    showTemplates={false}
                    placeholder={t('tasks.descriptionPlaceholder')}
                    tasksStats={checklistStats}
                    onExportClick={() => setIsExportModalOpen(true)}
                    onDeleteClick={() => setIsDeleteModalOpen(true)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '100%' }}>
                  <MarkdownViewer
                    content={content || '_No description provided_'}
                    allowToggleTasks={true}
                    onToggleTask={handleToggleTaskInContent}
                  />
                </Grid.Col>
              </Grid>
            )}

            {taskEditorLayoutMode === 'edit' && (
              <div style={{ height: '100%' }}>
                <MarkdownEditor
                  isLivePreview={false}
                  content={content}
                  onChange={handleContentChange}
                  onSave={handleSave}
                  isSaving={isSaving}
                  isDirty={isDirty}
                  showTemplates={false}
                  placeholder={t('tasks.descriptionPlaceholder')}
                  tasksStats={checklistStats}
                  onExportClick={() => setIsExportModalOpen(true)}
                  onDeleteClick={() => setIsDeleteModalOpen(true)}
                />
              </div>
            )}

            {taskEditorLayoutMode === 'preview' && (
              <div style={{ height: '100%' }}>
                <MarkdownViewer
                  content={content || '_No description provided_'}
                  allowToggleTasks={true}
                  onToggleTask={handleToggleTaskInContent}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Collapsible Task Properties Panel */}
        {isTaskPropertiesPanelOpen && (
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              width: 320,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
              overflow: 'hidden',
            }}
          >
            <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
              <Stack gap="md" pr={4}>
                {/* Properties Header */}
                <Group justify="space-between" align="center">
                  <Text fw={700} size="sm">
                    {t('tasks.taskProperties', 'Task Metadata')}
                  </Text>
                  {currentStatusObj && (
                    <Badge size="sm" color={currentStatusObj.color || 'blue'} variant="light">
                      {currentStatusObj.label}
                    </Badge>
                  )}
                </Group>

                <Divider />

                {/* Status Selection */}
                <Select
                  label="Status"
                  value={status}
                  onChange={(val) => val && handleStatusChange(val as TaskStatus)}
                  data={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
                  radius="md"
                  allowDeselect={false}
                  leftSection={
                    currentStatusObj ? (
                      <span style={{ color: `var(--mantine-color-${currentStatusObj.color}-filled)` }}>
                        {getColumnIcon(currentStatusObj.iconName, 16)}
                      </span>
                    ) : undefined
                  }
                  renderOption={({ option }) => {
                    const opt = statusOptions.find((o) => o.value === option.value);
                    return (
                      <Group gap="xs">
                        <span style={{ color: `var(--mantine-color-${opt?.color || 'blue'}-filled)` }}>
                          {getColumnIcon(opt?.iconName, 15)}
                        </span>
                        <Badge size="xs" color={opt?.color || 'blue'} variant="dot">
                          {option.label}
                        </Badge>
                      </Group>
                    );
                  }}
                />

                {/* Priority Selection */}
                <Select
                  label={t('tasks.priority')}
                  value={priority}
                  onChange={(val) => {
                    if (val) {
                      setPriority(val as TaskPriority);
                      setIsDirty(true);
                    }
                  }}
                  data={priorityOptions.map((p) => ({ value: p.value, label: p.label }))}
                  leftSection={<IconFlag size={16} />}
                  radius="md"
                  allowDeselect={false}
                  renderOption={({ option }) => {
                    const pObj = priorityOptions.find((p) => p.value === option.value);
                    return (
                      <Group gap="xs">
                        <Badge size="xs" color={pObj?.color || 'gray'} variant="filled">
                          {option.label}
                        </Badge>
                      </Group>
                    );
                  }}
                />

                {/* Area Selection */}
                <Select
                  label={t('areas.areaLabel', 'Area (Service)')}
                  value={area}
                  onChange={(val) => {
                    if (val) {
                      setArea(val);
                      setIsDirty(true);
                      if (project) {
                        const projMatches = projects.some(
                          (p) => p.name.toLowerCase() === project.toLowerCase() && (p.areaName || '').toLowerCase() === val.toLowerCase()
                        );
                        if (!projMatches) setProject(null);
                      }
                    }
                  }}
                  data={areas.map((a) => ({
                    value: a.name,
                    label: a.name,
                  }))}
                  radius="md"
                  allowDeselect={false}
                  renderOption={({ option }) => {
                    const aColor = getAreaColor(option.value, areas);
                    return (
                      <Group gap="xs">
                        <Badge size="xs" color={aColor} variant="filled">
                          {option.label}
                        </Badge>
                      </Group>
                    );
                  }}
                />

                {/* Project Selection */}
                <Select
                  label={t('areas.projectLabel', 'Project')}
                  placeholder={t('areas.noProject', 'None (Direct Area task)')}
                  value={project}
                  onChange={(val) => {
                    setProject(val || null);
                    setIsDirty(true);
                  }}
                  data={[
                    { value: '', label: t('areas.noProject', 'None (Direct Area task)') },
                    ...availableProjectsForArea.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })),
                  ]}
                  radius="md"
                  clearable
                  renderOption={({ option }) => {
                    if (!option.value) return <Text size="sm" c="dimmed">{option.label}</Text>;
                    const pColor = getProjectColor(option.value, area, projects, areas);
                    return (
                      <Group gap="xs">
                        <Badge size="xs" color={pColor} variant="light">
                          {option.label}
                        </Badge>
                      </Group>
                    );
                  }}
                />

                {/* Inherited Context Banner */}
                {resolvedInheritedContext.inheritedTags.length > 0 && (
                  <Paper
                    p="xs"
                    radius="sm"
                    withBorder
                    style={{
                      backgroundColor: isDark ? 'rgba(76, 110, 245, 0.05)' : 'rgba(76, 110, 245, 0.03)',
                      borderColor: isDark ? 'rgba(76, 110, 245, 0.2)' : 'rgba(76, 110, 245, 0.15)',
                    }}
                  >
                    <Group gap="xs" align="center">
                      <Text size="xs" fw={600} c="indigo">
                        {t('areas.autoInherited', 'Inherited Context')}:
                      </Text>
                      {resolvedInheritedContext.inheritedTags.map((tg) => (
                        <Badge key={tg} size="xs" color={currentAreaColor} variant="dot">
                          #{tg}
                        </Badge>
                      ))}
                    </Group>
                  </Paper>
                )}

                {/* Due Date */}
                <DatePickerInput
                  label={t('tasks.dueDate')}
                  placeholder={t('tasks.noDueDate')}
                  value={dueDate}
                  onChange={(val) => {
                    setDueDate(val);
                    setIsDirty(true);
                  }}
                  leftSection={<IconCalendar size={16} />}
                  clearable
                  radius="md"
                />

                {/* Started Date */}
                <DatePickerInput
                  label={t('tasks.startedDate')}
                  placeholder={t('tasks.noStartedDate')}
                  value={startedDate}
                  onChange={(val) => {
                    setStartedDate(val);
                    setIsDirty(true);
                  }}
                  leftSection={<IconClockPlay size={16} />}
                  clearable
                  radius="md"
                />

                {/* Completed Date */}
                <DatePickerInput
                  label={t('tasks.completedDate')}
                  placeholder={t('tasks.noCompletedDate')}
                  value={completedDate}
                  onChange={(val) => {
                    setCompletedDate(val);
                    setIsDirty(true);
                  }}
                  leftSection={<IconClockCheck size={16} />}
                  clearable
                  radius="md"
                />

                {/* Tags */}
                <TagsInput
                  label={t('tasks.tags')}
                  placeholder={t('tasks.addTagPlaceholder')}
                  value={tags}
                  onChange={(val) => {
                    setTags(val);
                    setIsDirty(true);
                  }}
                  data={allTags.map((t) => t.name)}
                  leftSection={<IconTag size={16} />}
                  clearable
                  radius="md"
                  renderOption={({ option }) => {
                    const tagColor = getTagColor(option.value, allTags);
                    const tagDef = allTags.find((t) => t.name.toLowerCase() === option.value.toLowerCase());
                    return (
                      <Group justify="space-between" w="100%" gap="xs">
                        <Badge size="xs" color={tagColor} variant="light">
                          #{option.value}
                        </Badge>
                        {tagDef?.service && (
                          <Text size="xs" c="dimmed">
                            {tagDef.service} {tagDef.project ? `• ${tagDef.project}` : ''}
                          </Text>
                        )}
                      </Group>
                    );
                  }}
                />

                <Divider my="xs" />

                {/* Quick Actions */}
                <Stack gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    radius="md"
                    leftSection={<IconCalendarPlus size={15} />}
                    loading={isLogging}
                    onClick={handleLogToDaily}
                  >
                    {t('tasks.logToDailyNote')}
                  </Button>

                  {window.electronAPI && activeTask?.filepath && (
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      radius="md"
                      leftSection={<IconFolderOpen size={15} />}
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
                    leftSection={<IconTrash size={15} />}
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    {t('tasks.deleteTask')}
                  </Button>
                </Stack>
              </Stack>
            </ScrollArea>
          </Paper>
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
