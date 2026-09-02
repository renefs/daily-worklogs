import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  TextInput,
  Select,
  TagsInput,
  Button,
  Group,
  Stack,
  Tabs,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Paper,
  Divider,
  useComputedColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconTrash,
  IconDeviceFloppy,
  IconEdit,
  IconEye,
  IconCalendar,
  IconTag,
  IconFlag,
  IconListCheck,
  IconFolderOpen,
  IconFilePlus,
  IconClockPlay,
  IconClockCheck,
  IconPhoto,
  IconArrowsMaximize,
  IconWriting,
} from '@tabler/icons-react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, TaskPriority, TaskStatus } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { getColumnIcon, getColumnTitle } from '../kanban/columnUtils';
import { getTagColor } from '../../utils/tagUtils';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getProjectColor,
  resolveTaskContext,
} from '../../utils/areaProjectUtils';
import { createTagAutocompleteExtension } from '../editor/tagAutocompleteExtension';
import { liveMarkdownExtension } from '../editor/liveMarkdownExtension';

export const TaskModal: React.FC = () => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    isTaskModalOpen,
    activeTask,
    taskModalInitialStatus,
    closeTaskModal,
    openTaskEditor,
    createOrUpdateTask,
    deleteTask,
    logTaskToDailyNote,
    settings,
    allTags,
    areas = DEFAULT_AREAS,
    projects = [],
  } = useAppStoreSelector((state) => ({
    isTaskModalOpen: state.isTaskModalOpen,
    activeTask: state.activeTask,
    taskModalInitialStatus: state.taskModalInitialStatus,
    closeTaskModal: state.closeTaskModal,
    openTaskEditor: state.openTaskEditor,
    createOrUpdateTask: state.createOrUpdateTask,
    deleteTask: state.deleteTask,
    logTaskToDailyNote: state.logTaskToDailyNote,
    settings: state.settings,
    allTags: state.allTags,
    areas: state.areas,
    projects: state.projects,
  }));

  const allTagsRef = useRef(allTags);
  useEffect(() => {
    allTagsRef.current = allTags;
  }, [allTags]);

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
  const [activeTab, setActiveTab] = useState<string | null>('write');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

    // If task has a custom status not currently in columns, include it
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

  // Available projects filtered by current selected area
  const availableProjectsForArea = useMemo(() => {
    const cleanArea = (area || '').toLowerCase().trim();
    if (!cleanArea) return projects;
    return projects.filter((p) => (p.areaName || '').toLowerCase() === cleanArea);
  }, [projects, area]);

  // Inherited tags resolution
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

  // Initialize or reset form when modal opens / task changes
  useEffect(() => {
    if (isTaskModalOpen) {
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
      }
      setActiveTab('write');
      setIsDeleting(false);
      setIsSaving(false);
      setIsLogging(false);
      setIsDraggingOver(false);
    }
  }, [isTaskModalOpen, activeTask, taskModalInitialStatus, availableColumns, areas, projects, allTags]);

  const handleInsertImage = async () => {
    try {
      const res = await window.electronAPI.selectImageDialog();
      if (res.success && res.relativePath) {
        const imageMarkdown = `\n![${res.filename || 'Image'}](${res.relativePath})\n`;
        setContent((prev) => (prev ? `${prev}${imageMarkdown}` : imageMarkdown.trim()));
        notifications.show({
          title: t('editor.imageSaved') || 'Image Added',
          message: res.filename,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err: any) {
      console.error('Error selecting image for task:', err);
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    let inserted = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)) {
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const sourcePath = (file as any).path;
        const res = await window.electronAPI.saveImage({
          sourcePath,
          buffer,
          originalName: file.name,
          mimeType: file.type,
        });

        if (res.success && res.relativePath) {
          const imageMarkdown = `\n![${res.filename || file.name}](${res.relativePath})\n`;
          setContent((prev) => (prev ? `${prev}${imageMarkdown}` : imageMarkdown.trim()));
          inserted++;
        }
      } catch (err) {
        console.error('Error saving dropped/pasted image in task:', err);
      }
    }

    if (inserted > 0) {
      notifications.show({
        title: t('editor.imageSaved') || 'Image Added',
        message: `${inserted} ${t('editor.imagesSavedMessage') || 'image(s) saved to vault'}`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const hasImage = Array.from(e.dataTransfer.files).some(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(f.name)
      );
      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        await processImageFiles(e.dataTransfer.files);
      }
    }
    setIsDraggingOver(false);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processImageFiles(imageFiles);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
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
      // If moving away from completed/cancelled, clear completedDate
      setCompletedDate(null);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const formattedDue = dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : undefined;
      const formattedStarted = startedDate ? dayjs(startedDate).format('YYYY-MM-DD') : undefined;
      const formattedCompleted = completedDate ? dayjs(completedDate).format('YYYY-MM-DD') : undefined;

      const result = await createOrUpdateTask({
        id: activeTask?.id,
        taskId: activeTask?.taskId,
        filename: activeTask?.filename,
        title: title.trim(),
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
        notifications.show({
          title: t('tasks.taskSaved'),
          message: `${result.title}`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
        closeTaskModal();
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogToDaily = async () => {
    if (!activeTask && !title.trim()) return;
    setIsLogging(true);
    try {
      const taskToLog = activeTask || {
        id: 'new',
        filename: '',
        filepath: '',
        title: title.trim(),
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
    if (!activeTask) return;
    setIsSaving(true);
    try {
      await deleteTask(activeTask.filename);
      notifications.show({
        title: t('tasks.taskDeleted'),
        message: activeTask.title,
        color: 'red',
        icon: <IconTrash size={16} />,
      });
      closeTaskModal();
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

  return (
    <Modal
      opened={isTaskModalOpen}
      onClose={closeTaskModal}
      title={
        <Group justify="space-between" align="center" style={{ width: '100%', paddingRight: 8 }}>
          <Group gap="xs">
            <IconListCheck size={20} color="var(--mantine-primary-color-filled)" />
            <Text fw={700} size="md">
              {activeTask ? t('tasks.editTask') : t('tasks.newTask')}
            </Text>
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
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontWeight: 700,
                  }}
                >
                  #{activeTask.taskId ?? activeTask.id}
                </Badge>
              </Tooltip>
            )}
          </Group>

          <Tooltip label={t('tasks.openInFullEditor', 'Open in Full Editor')} withArrow>
            <ActionIcon
              variant="light"
              color="primary"
              size="sm"
              radius="md"
              onClick={() => {
                const formattedDue = dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : undefined;
                const formattedStarted = startedDate ? dayjs(startedDate).format('YYYY-MM-DD') : undefined;
                const formattedCompleted = completedDate ? dayjs(completedDate).format('YYYY-MM-DD') : undefined;

                openTaskEditor(
                  {
                    id: activeTask?.id || 'draft',
                    taskId: activeTask?.taskId,
                    filename: activeTask?.filename || '',
                    filepath: activeTask?.filepath || '',
                    title: title.trim(),
                    status,
                    priority,
                    area: area.trim() || undefined,
                    project: project ? project.trim() : undefined,
                    due: formattedDue,
                    startedDate: formattedStarted,
                    completedDate: formattedCompleted,
                    tags,
                    content,
                    created: activeTask?.created || dayjs().format('YYYY-MM-DD'),
                  },
                  status
                );
              }}
            >
              <IconArrowsMaximize size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      size="xl"
      radius="md"
      centered
      padding="md"
    >
      <Stack gap="md">
        {/* Title input */}
        <TextInput
          label={t('tasks.titleField', 'Title')}
          placeholder={t('tasks.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          autoFocus
          radius="md"
          size="md"
          styles={{
            input: {
              fontWeight: 600,
            },
          }}
        />

        {/* Row 0: Area vs. Project (Things 3 / OmniFocus model) */}
        <Group grow align="flex-start">
          <Select
            label={t('areas.areaLabel', 'Area (Service)')}
            description={t('areas.areaFieldDesc', 'Permanent continuous domain')}
            value={area}
            onChange={(val) => {
              if (val) {
                setArea(val);
                // If current project doesn't belong to new area, reset project
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

          <Select
            label={t('areas.projectLabel', 'Project')}
            description={t('areas.projectFieldDesc', 'Finite effort with a goal')}
            placeholder={t('areas.noProject', 'None (Direct Area task)')}
            value={project}
            onChange={(val) => setProject(val || null)}
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
        </Group>

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
                <Badge key={tg} size="xs" color={getAreaColor(area, areas)} variant="dot">
                  #{tg}
                </Badge>
              ))}
              <Text size="xs" c="dimmed" style={{ marginLeft: 'auto' }}>
                {t('areas.cleanTitleNotice', 'Title is kept clean without prefixes')}
              </Text>
            </Group>
          </Paper>
        )}

        {/* Row 1: Status & Priority */}
        <Group grow align="flex-start">
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

          <Select
            label={t('tasks.priority')}
            value={priority}
            onChange={(val) => val && setPriority(val as TaskPriority)}
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
        </Group>

        {/* Row 2: Due Date & Tags */}
        <Group grow align="flex-start">
          <DatePickerInput
            label={t('tasks.dueDate')}
            placeholder={t('tasks.noDueDate')}
            value={dueDate}
            onChange={setDueDate}
            leftSection={<IconCalendar size={16} />}
            clearable
            radius="md"
          />

          <TagsInput
            label={t('tasks.tags')}
            placeholder={t('tasks.addTagPlaceholder')}
            value={tags}
            onChange={setTags}
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
        </Group>

        {/* Row 3: Tracking & Lifecycle Dates (Started & Completed) */}
        <Group grow align="flex-start">
          <DatePickerInput
            label={t('tasks.startedDate')}
            placeholder={t('tasks.noStartedDate')}
            value={startedDate}
            onChange={setStartedDate}
            leftSection={<IconClockPlay size={16} />}
            clearable
            radius="md"
          />

          <DatePickerInput
            label={t('tasks.completedDate')}
            placeholder={t('tasks.noCompletedDate')}
            value={completedDate}
            onChange={setCompletedDate}
            leftSection={<IconClockCheck size={16} />}
            clearable
            radius="md"
          />
        </Group>

        {/* Markdown Content Section */}
        <div>
          <Group justify="space-between" align="center" mb={6}>
            <Group gap="xs">
              <Text size="sm" fw={500}>
                {t('tasks.markdownEditor')}
              </Text>
              {(activeTab === 'write' || activeTab === 'live') && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  leftSection={<IconPhoto size={14} />}
                  onClick={handleInsertImage}
                >
                  {t('editor.insertImage') || 'Add Image'}
                </Button>
              )}
            </Group>
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
              <Tabs.List>
                <Tabs.Tab value="live" leftSection={<IconWriting size={14} />}>
                  {t('editor.live')}
                </Tabs.Tab>
                <Tabs.Tab value="write" leftSection={<IconEdit size={14} />}>
                  {t('editor.write')}
                </Tabs.Tab>
                <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
                  {t('tasks.markdownPreview')}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>

          {activeTab === 'live' ? (
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              className={isDraggingOver ? 'editor-dropzone-active' : ''}
              style={{
                height: 260,
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: isDark ? '#141517' : '#ffffff',
                fontSize: `${settings?.editorFontSize ? settings.editorFontSize - 1 : 14}px`,
              }}
            >
              <CodeMirror
                value={content}
                height="100%"
                theme={isDark ? oneDark : 'light'}
                extensions={[
                  markdown(),
                  createTagAutocompleteExtension(() => allTagsRef.current),
                  ...liveMarkdownExtension({
                    copyCode: t('editor.copyCode'),
                    editTable: t('editor.editTable'),
                    imageNotFound: t('editor.imageNotFound'),
                  }),
                ]}
                onChange={(val) => setContent(val)}
                placeholder={t('tasks.descriptionPlaceholder')}
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLine: false,
                  autocompletion: true,
                }}
                style={{ height: '100%' }}
              />
            </div>
          ) : activeTab === 'write' ? (
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              className={isDraggingOver ? 'editor-dropzone-active' : ''}
              style={{
                height: 260,
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: isDark ? '#141517' : '#ffffff',
                fontSize: `${settings?.editorFontSize ? settings.editorFontSize - 1 : 14}px`,
              }}
            >
              <CodeMirror
                value={content}
                height="100%"
                theme={isDark ? oneDark : 'light'}
                extensions={[markdown(), createTagAutocompleteExtension(() => allTagsRef.current)]}
                onChange={(val) => setContent(val)}
                placeholder={t('tasks.descriptionPlaceholder')}
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLine: false,
                  autocompletion: true,
                }}
                style={{ height: '100%' }}
              />
            </div>
          ) : (
            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{ height: 260, overflow: 'auto', backgroundColor: 'var(--mantine-color-body)' }}
            >
              <MarkdownViewer content={content || '_No description provided_'} allowToggleTasks={false} />
            </Paper>
          )}
        </div>

        {/* Info & Metadata indicator */}
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" c="dimmed">
            {t('tasks.frontmatterInfo')}
          </Text>
          {activeTask?.filepath && (
            <Tooltip label={t('tasks.openInFileManager')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={handleOpenFileInFileManager}>
                <IconFolderOpen size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        <Divider />

        {/* Action Buttons */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {activeTask && (
              isDeleting ? (
                <Group gap="xs">
                  <Text size="xs" c="red" fw={600}>
                    Confirm delete?
                  </Text>
                  <Button color="red" size="xs" radius="md" onClick={handleDelete} loading={isSaving}>
                    {t('common.delete')}
                  </Button>
                  <Button variant="default" size="xs" radius="md" onClick={() => setIsDeleting(false)}>
                    {t('common.cancel')}
                  </Button>
                </Group>
              ) : (
                <Button
                  variant="subtle"
                  color="red"
                  size="sm"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setIsDeleting(true)}
                >
                  {t('common.delete')}
                </Button>
              )
            )}

            <Button
              variant="light"
              color="indigo"
              size="sm"
              leftSection={<IconFilePlus size={16} />}
              onClick={handleLogToDaily}
              loading={isLogging}
              radius="md"
            >
              {t('tasks.logToDailyNote')}
            </Button>
          </Group>

          <Group gap="xs">
            <Button variant="default" onClick={closeTaskModal} radius="md">
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              disabled={!title.trim()}
              loading={isSaving}
              radius="md"
            >
              {t('common.save')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
