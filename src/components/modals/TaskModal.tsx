import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  TextInput,
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
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconTrash,
  IconDeviceFloppy,
  IconEdit,
  IconEye,
  IconListCheck,
  IconArrowsMaximize,
  IconPhoto,
} from '@tabler/icons-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, TaskPriority, TaskStatus } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { createTagAutocompleteExtension } from '../editor/tagAutocompleteExtension';
import { liveMarkdownExtension } from '../editor/liveMarkdownExtension';
import { TaskPropertiesForm } from '../tasks/TaskPropertiesForm';
import { TaskChecklistProgress } from '../tasks/TaskChecklistProgress';
import { TaskDeleteModal } from '../tasks/TaskDeleteModal';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'description' | 'preview'>('details');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const availableColumns = useMemo(() => {
    return settings?.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;
  }, [settings?.kanbanColumns]);

  useEffect(() => {
    if (activeTask) {
      setTitle(activeTask.title || '');
      setArea(activeTask.area || 'General');
      setProject(activeTask.project || null);
      setStatus(activeTask.status || 'todo');
      setPriority(activeTask.priority || 'medium');
      setDueDate(activeTask.due ? new Date(activeTask.due) : null);
      setStartedDate(activeTask.startedDate ? new Date(activeTask.startedDate) : null);
      setCompletedDate(activeTask.completedDate ? new Date(activeTask.completedDate) : null);
      setTags(activeTask.tags || []);
      setContent(activeTask.content || '');
      setActiveTab('details');
    } else {
      setTitle('');
      setArea('General');
      setProject(null);
      setStatus(taskModalInitialStatus || 'todo');
      setPriority('medium');
      setDueDate(null);
      setStartedDate(null);
      setCompletedDate(null);
      setTags([]);
      setContent('');
      setActiveTab('details');
    }
  }, [activeTask, isTaskModalOpen, taskModalInitialStatus]);

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
      setIsDeleteModalOpen(false);
      closeTaskModal();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    if (!window.electronAPI) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)) {
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const res = await window.electronAPI.saveImage({
          buffer,
          originalName: file.name,
          mimeType: file.type,
        });
        if (res.success && res.relativePath) {
          const imageMd = `\n![${res.filename || file.name}](${res.relativePath})\n`;
          setContent((prev) => `${prev}${imageMd}`);
        }
      } catch (err) {
        console.error('Failed to save dropped image in task modal:', err);
      }
    }
  };

  const extensions = useMemo(() => {
    return [
      markdown({ extensions: GFM }),
      createTagAutocompleteExtension(() => allTagsRef.current),
      liveMarkdownExtension({
        copyCode: t('editor.copyCode'),
        editTable: t('editor.editTable'),
        imageNotFound: t('editor.imageNotFound'),
        toggleTask: t('editor.toggleTask'),
      }),
    ];
  }, [t]);

  return (
    <>
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
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard.writeText(`#${activeTask.taskId ?? activeTask.id}`);
                      notifications.show({
                        title: t('common.copied'),
                        message: `#${activeTask.taskId ?? activeTask.id}`,
                        color: 'teal',
                        icon: <IconCheck size={16} />,
                        autoClose: 1500,
                      });
                    }}
                  >
                    #{activeTask.taskId ?? activeTask.id}
                  </Badge>
                </Tooltip>
              )}
            </Group>

            <Group gap="xs">
              {activeTask && (
                <Tooltip label={t('tasks.openInFullEditor', 'Open in Full Editor')} withArrow>
                  <ActionIcon
                    variant="light"
                    color="primary"
                    size="sm"
                    radius="md"
                    onClick={() => {
                      closeTaskModal();
                      openTaskEditor(activeTask);
                    }}
                  >
                    <IconArrowsMaximize size={15} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
        }
        size="lg"
        centered
        radius="md"
      >
        <Stack gap="md">
          {/* Title */}
          <TextInput
            label={t('tasks.taskTitle')}
            placeholder={t('tasks.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            autoFocus
            radius="md"
          />

          <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val as 'details' | 'description' | 'preview')} radius="md">
            <Tabs.List mb="sm">
              <Tabs.Tab value="details" leftSection={<IconListCheck size={15} />}>
                {t('tasks.details', 'Details')}
              </Tabs.Tab>
              <Tabs.Tab value="description" leftSection={<IconEdit size={15} />}>
                {t('tasks.description', 'Description')}
              </Tabs.Tab>
              <Tabs.Tab value="preview" leftSection={<IconEye size={15} />}>
                {t('editor.preview')}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="details">
              <Stack gap="md">
                <TaskChecklistProgress content={content} />
                <TaskPropertiesForm
                  area={area}
                  onAreaChange={setArea}
                  project={project}
                  onProjectChange={setProject}
                  status={status}
                  onStatusChange={handleStatusChange}
                  priority={priority}
                  onPriorityChange={setPriority}
                  dueDate={dueDate}
                  onDueDateChange={setDueDate}
                  startedDate={startedDate}
                  onStartedDateChange={setStartedDate}
                  completedDate={completedDate}
                  onCompletedDateChange={setCompletedDate}
                  tags={tags}
                  onTagsChange={setTags}
                  areas={areas}
                  projects={projects}
                  availableColumns={availableColumns}
                  allTags={allTags}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="description">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="xs" c="dimmed">
                    {t('tasks.descriptionHelp', 'Markdown supported. You can drop images or checklists here.')}
                  </Text>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    leftSection={<IconPhoto size={13} />}
                    onClick={async () => {
                      if (!window.electronAPI) return;
                      const res = await window.electronAPI.selectImageDialog();
                      if (res.success && res.relativePath) {
                        setContent((prev) => `${prev}\n![${res.filename || 'Image'}](${res.relativePath})\n`);
                      }
                    }}
                  >
                    {t('editor.insertImage')}
                  </Button>
                </Group>

                <Paper
                  withBorder
                  radius="md"
                  p={4}
                  style={{
                    backgroundColor: isDark ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-0)',
                    borderColor: isDraggingOver ? 'var(--mantine-primary-color-filled)' : undefined,
                    minHeight: 240,
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files) void processImageFiles(e.dataTransfer.files);
                  }}
                >
                  <CodeMirror
                    ref={editorRef}
                    value={content}
                    height="240px"
                    theme={isDark ? oneDark : 'light'}
                    extensions={extensions}
                    onChange={(val) => setContent(val)}
                    placeholder={t('tasks.contentPlaceholder')}
                  />
                </Paper>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="preview">
              <Paper withBorder p="md" radius="md" style={{ minHeight: 240, maxHeight: 360, overflowY: 'auto' }}>
                <MarkdownViewer content={content || `*${t('editor.emptyNote')}*`} />
              </Paper>
            </Tabs.Panel>
          </Tabs>

          <Divider my="xs" />

          {/* Footer actions */}
          <Group justify="space-between" align="center">
            <Group gap="xs">
              {activeTask && (
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => setIsDeleteModalOpen(true)}
                  loading={isSaving}
                >
                  {t('common.delete')}
                </Button>
              )}
              <Button
                variant="subtle"
                color="blue"
                size="xs"
                onClick={handleLogToDaily}
                loading={isLogging}
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
                onClick={handleSave}
                loading={isSaving}
                disabled={!title.trim()}
                leftSection={<IconDeviceFloppy size={16} />}
                radius="md"
              >
                {t('common.save')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <TaskDeleteModal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDelete}
        isSaving={isSaving}
        taskTitle={title || activeTask?.title || ''}
        filename={activeTask?.filename}
      />
    </>
  );
};
