import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { TaskItem } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { registerTaskEditorFlush } from '../../services/editorSession';
import { TaskHeader } from '../tasks/TaskHeader';
import { TaskDeleteModal } from '../tasks/TaskDeleteModal';
import { useTaskForm } from '../tasks/useTaskForm';
import { TaskWorkspace } from './task/TaskWorkspace';
import clsx from 'clsx';
import classes from './TaskView.module.css';

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

  const form = useTaskForm({
    task: activeTask,
    defaultStatus: taskModalInitialStatus,
    kanbanColumns: settings?.kanbanColumns,
    areas,
    projects,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const lastActiveTaskRef = useRef<TaskItem | null>(activeTask);
  const persistedTaskRef = useRef<TaskItem | null>(activeTask);
  if (lastActiveTaskRef.current !== activeTask) {
    lastActiveTaskRef.current = activeTask;
    persistedTaskRef.current = activeTask;
  }
  const failedDraftSignatureRef = useRef<string | null>(null);
  const taskSaveInFlightRef = useRef<Promise<TaskItem | null> | null>(null);
  const handleSaveRef = useRef<() => Promise<TaskItem | null>>(async () => null);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    const saveJustFinished = wasSavingRef.current && !isSaving;
    wasSavingRef.current = isSaving;
    if (!saveJustFinished || form.isDirty || taskSaveError) return;

    setShowSavedConfirmation(true);
    const timer = window.setTimeout(() => setShowSavedConfirmation(false), 2000);
    return () => window.clearTimeout(timer);
  }, [form.isDirty, isSaving, taskSaveError]);

  useEffect(() => {
    if (taskSaveError && failedDraftSignatureRef.current !== form.draftSignature) {
      setTaskSaveError(null);
    }
  }, [form.draftSignature, taskSaveError]);

  const handleSave = useCallback(
    async (): Promise<TaskItem | null> => {
      if (!form.title.trim()) {
        const errorMsg = t('tasks.titleRequired', 'Title is required to save');
        setTaskSaveError(errorMsg);
        notifications.show({
          title: t('common.error'),
          message: errorMsg,
          color: 'red',
        });
        return null;
      }

      if (taskSaveInFlightRef.current) {
        return taskSaveInFlightRef.current;
      }

      const currentDraftSignature = form.draftSignature;
      setIsSaving(true);
      setTaskSaveError(null);

      const savePromise = (async () => {
        try {
          const payload = form.buildTaskPayload(persistedTaskRef.current);
          const result = await createOrUpdateTask(payload);
          if (result) {
            persistedTaskRef.current = result;
            failedDraftSignatureRef.current = null;
            form.setIsDirty(false);
            return result;
          }
          throw new Error(t('tasks.saveFailedMessage', 'Could not write task markdown file to disk.'));
        } catch (err) {
          failedDraftSignatureRef.current = currentDraftSignature;
          const errorMessage =
            err instanceof Error
              ? err.message
              : t('tasks.saveFailedMessage', 'Could not write task markdown file to disk.');
          setTaskSaveError(errorMessage);
          notifications.show({
            title: t('tasks.saveFailedTitle', 'Task Save Failed'),
            message: errorMessage,
            color: 'red',
          });
          return null;
        } finally {
          setIsSaving(false);
          taskSaveInFlightRef.current = null;
        }
      })();

      taskSaveInFlightRef.current = savePromise;
      return savePromise;
    },
    [form, createOrUpdateTask, t]
  );

  handleSaveRef.current = handleSave;

  // Autosave when dirty
  useEffect(() => {
    if (!settings?.autoSave || !form.isDirty || isSaving || taskSaveError) return;

    const timer = setTimeout(() => {
      void handleSave();
    }, settings.autoSaveDelay ?? 1000);

    return () => clearTimeout(timer);
  }, [form.isDirty, isSaving, taskSaveError, settings?.autoSave, settings?.autoSaveDelay, handleSave]);

  // Global app save listener (Cmd+S)
  useEffect(() => {
    const handleAppSave = () => {
      void handleSave();
    };
    window.addEventListener('app:save', handleAppSave);
    return () => {
      window.removeEventListener('app:save', handleAppSave);
    };
  }, [handleSave]);

  // Flush before shutdown
  useEffect(() => {
    return registerTaskEditorFlush(async () => {
      if (!form.isDirty) return true;
      const saved = await handleSaveRef.current();
      return Boolean(saved);
    });
  }, [form.isDirty]);

  const handleLogToDaily = async () => {
    if (!form.title.trim()) return;
    setIsLogging(true);
    try {
      const payload = form.buildTaskPayload(persistedTaskRef.current);
      const success = await logTaskToDailyNote(payload);
      if (success) {
        notifications.show({
          title: t('tasks.taskLoggedToDaily'),
          message: form.title.trim(),
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err) {
      console.error('Failed to log task:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = async () => {
    const taskToDelete = persistedTaskRef.current;
    if (!taskToDelete?.filename) return;

    setIsSaving(true);
    try {
      await deleteTask(taskToDelete.filename);
      notifications.show({
        title: t('tasks.taskDeleted'),
        message: taskToDelete.title,
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
    if (window.electronAPI && persistedTaskRef.current?.filepath) {
      window.electronAPI.openInFileManager(persistedTaskRef.current.filepath);
    }
  };

  const handleScrollToHeading = (headingId: string) => {
    const elem = document.getElementById(headingId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={clsx(classes.container, 'task-view-container')}>
      <TaskHeader
        activeTask={persistedTaskRef.current}
        title={form.title}
        onTitleChange={(val) => {
          form.setTitle(val);
          form.setIsDirty(true);
        }}
        isClosed={form.isClosed}
        isDark={isDark}
        area={form.area}
        project={form.project}
        priority={form.priority}
        dateBadgeText={form.dateBadgeText}
        currentAreaColor={form.currentAreaColor}
        currentProjectColor={form.currentProjectColor}
        layoutMode={taskEditorLayoutMode}
        onLayoutModeChange={setTaskEditorLayoutMode}
        isPropertiesPanelOpen={isTaskPropertiesPanelOpen}
        onTogglePropertiesPanel={toggleTaskPropertiesPanel}
        isDirty={form.isDirty}
        isSaving={isSaving}
        taskSaveError={taskSaveError}
        showSavedConfirmation={showSavedConfirmation}
        onSave={() => handleSave()}
        onBack={() => {
          void (async () => {
            if (form.isDirty && !(await handleSave())) return;
            closeTaskEditor();
          })();
        }}
        onLogToDaily={handleLogToDaily}
        onExportClick={() => setIsExportModalOpen(true)}
        onOpenFileManager={persistedTaskRef.current?.filepath ? handleOpenFileInFileManager : undefined}
        onDeleteClick={() => setIsDeleteModalOpen(true)}
      />

      <TaskWorkspace
        taskId={activeTask?.taskId}
        layoutMode={taskEditorLayoutMode}
        content={form.content}
        onContentChange={(val) => {
          form.setContent(val);
          form.setIsDirty(true);
        }}
        onSave={() => handleSave()}
        isSaving={isSaving}
        isDirty={form.isDirty}
        taskStats={form.taskStatsForEditor}
        onToggleTaskInContent={form.handleToggleTaskInContent}
        isPropertiesPanelOpen={isTaskPropertiesPanelOpen}
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
        isLogging={isLogging}
        onLogToDaily={handleLogToDaily}
        onExportClick={() => setIsExportModalOpen(true)}
        onOpenFileManager={persistedTaskRef.current?.filepath ? handleOpenFileInFileManager : undefined}
        onDeleteClick={() => setIsDeleteModalOpen(true)}
        onScrollToHeading={handleScrollToHeading}
      />

      <TaskDeleteModal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        taskTitle={persistedTaskRef.current?.title || form.title}
        isSaving={isSaving}
        onDelete={handleDelete}
      />

      <ExportModal
        opened={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={t('tasks.exportTask', 'Export Task')}
        content={form.content}
        defaultFileName={
          persistedTaskRef.current?.filename?.replace(/\.md$/, '') ||
          form.title ||
          'task-export'
        }
      />
    </div>
  );
};
