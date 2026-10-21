import React, { useState, useCallback } from 'react';
import {
  Modal,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Divider,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconTrash,
  IconDeviceFloppy,
  IconListCheck,
  IconArrowsMaximize,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { useTaskForm } from '../tasks/useTaskForm';
import { TaskModalBody } from './task/TaskModalBody';
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

  const [activeTab, setActiveTab] = useState<'details' | 'description' | 'preview'>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const form = useTaskForm({
    task: activeTask,
    defaultStatus: taskModalInitialStatus,
    kanbanColumns: settings?.kanbanColumns,
    areas,
    projects,
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      notifications.show({
        title: t('common.error'),
        message: t('tasks.titleRequired', 'Title is required'),
        color: 'red',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = form.buildTaskPayload(activeTask);
      const savedTask = await createOrUpdateTask(payload);
      if (savedTask) {
        closeTaskModal();
      } else {
        notifications.show({
          title: t('common.error', 'Error'),
          message: t('tasks.saveError', 'Failed to save task'),
          color: 'red',
        });
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      notifications.show({
        title: t('common.error'),
        message: t('tasks.saveError', 'Failed to save task'),
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogToDaily = async () => {
    if (!form.title.trim() && !activeTask) return;
    setIsLogging(true);
    try {
      const payload = form.buildTaskPayload(activeTask);
      const success = await logTaskToDailyNote(payload);
      if (success) {
        notifications.show({
          title: t('tasks.taskLoggedToDaily'),
          message: form.title.trim() || activeTask?.title || '',
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
    if (!activeTask?.filename) return;
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

  const processImageFiles = useCallback(
    async (files: FileList | File[]) => {
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
            form.setContent((prev) => `${prev}\n![${res.filename || file.name}](${res.relativePath})\n`);
          }
        } catch (err) {
          console.error('Failed to save dropped image in task modal:', err);
        }
      }
    },
    [form]
  );

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
                      void openTaskEditor(activeTask);
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
        <TaskModalBody
          taskId={activeTask?.taskId}
          title={form.title}
          onTitleChange={(val) => {
            form.setTitle(val);
            form.setIsDirty(true);
          }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          content={form.content}
          onContentChange={(val) => {
            form.setContent(val);
            form.setIsDirty(true);
          }}
          area={form.area}
          onAreaChange={(val) => {
            form.setArea(val);
            form.setIsDirty(true);
          }}
          project={form.project}
          onProjectChange={(val) => {
            form.setProject(val);
            form.setIsDirty(true);
          }}
          status={form.status}
          onStatusChange={form.handleStatusChange}
          priority={form.priority}
          onPriorityChange={(val) => {
            form.setPriority(val);
            form.setIsDirty(true);
          }}
          dueDate={form.dueDate}
          onDueDateChange={(val) => {
            form.setDueDate(val);
            form.setIsDirty(true);
          }}
          startedDate={form.startedDate}
          onStartedDateChange={(val) => {
            form.setStartedDate(val);
            form.setIsDirty(true);
          }}
          completedDate={form.completedDate}
          onCompletedDateChange={(val) => {
            form.setCompletedDate(val);
            form.setIsDirty(true);
          }}
          tags={form.tags}
          onTagsChange={(val) => {
            form.setTags(val);
            form.setIsDirty(true);
          }}
          areas={areas}
          projects={projects}
          availableColumns={form.availableColumns}
          allTags={allTags}
          isDark={isDark}
          onProcessImageFiles={processImageFiles}
        />

        <Divider my="xs" />

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
              color="gray"
              size="xs"
              onClick={handleLogToDaily}
              loading={isLogging}
            >
              {t('tasks.logToDaily', 'Log to Daily Note')}
            </Button>
          </Group>

          <Group gap="xs">
            <Button variant="default" size="xs" onClick={closeTaskModal}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="filled"
              color="primary"
              size="xs"
              leftSection={<IconDeviceFloppy size={14} />}
              onClick={handleSave}
              loading={isSaving}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Group>
      </Modal>

      <TaskDeleteModal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        taskTitle={activeTask?.title || ''}
        isSaving={isSaving}
        onDelete={handleDelete}
      />
    </>
  );
};
