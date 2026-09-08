import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, TaskItem, TaskPriority, TaskStatus } from '../../types';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getProjectColor,
} from '../../utils/areaProjectUtils';
import { registerTaskEditorFlush } from '../../services/editorSession';
import { TaskHeader } from '../tasks/TaskHeader';
import { TaskInspector } from '../tasks/TaskInspector';
import { TaskDeleteModal } from '../tasks/TaskDeleteModal';
import clsx from 'clsx';
import classes from './TaskView.module.css';

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

  const availableColumns = useMemo(() => {
    return settings?.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;
  }, [settings?.kanbanColumns]);

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

  const taskIdentityKey = activeTask
    ? activeTask.filename || `${activeTask.id || 'task'}:${activeTask.title}`
    : 'new-task';

  // Initialize or reset form state when active task identity changes
  useEffect(() => {
    if (initializedTaskKeyRef.current === taskIdentityKey) {
      return;
    }

    initializedTaskKeyRef.current = taskIdentityKey;
    persistedTaskRef.current = activeTask;
    failedDraftSignatureRef.current = null;
    setTaskSaveError(null);

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
      setIsDirty(false);
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
      setIsDirty(false);
    }
  }, [activeTask, taskIdentityKey, taskModalInitialStatus]);

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

  const handleToggleTaskInContent = (taskText: string, checked: boolean) => {
    const cleanTaskText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    const pattern = new RegExp(`(-\\s*\\[)([ xX])(\\]\\s*${cleanTaskText})`, 'i');
    const newContent = content.replace(pattern, (_match, p1, _p2, p3) => `${p1}${checked ? 'x' : ' '}${p3}`);
    if (newContent !== content) {
      setContent(newContent);
      setIsDirty(true);
    }
  };

  const handleSave = useCallback(
    async (options?: { showNotification?: boolean }): Promise<TaskItem | null> => {
      const showNotification = options?.showNotification ?? false;

      if (!title.trim()) {
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

      const currentDraftSignature = latestDraftSignatureRef.current;
      setIsSaving(true);
      setTaskSaveError(null);

      const savePromise = (async () => {
        try {
          const currentTarget = persistedTaskRef.current;
          const formattedDue = dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : undefined;
          const formattedStarted = startedDate ? dayjs(startedDate).format('YYYY-MM-DD') : undefined;
          const formattedCompleted = completedDate ? dayjs(completedDate).format('YYYY-MM-DD') : undefined;

          const taskData = {
            id: currentTarget?.id,
            taskId: currentTarget?.taskId,
            filename: currentTarget?.filename,
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
          };

          const result = await createOrUpdateTask(taskData);
          if (result) {
            persistedTaskRef.current = result;
            failedDraftSignatureRef.current = null;
            setIsDirty(false);

            if (showNotification) {
              notifications.show({
                title: t('tasks.taskSaved'),
                message: result.title,
                color: 'teal',
                icon: <IconCheck size={16} />,
                autoClose: 2000,
              });
            }
            return result;
          }
          throw new Error(t('tasks.saveFailedMessage', 'Could not write task markdown file to disk.'));
        } catch (err) {
          failedDraftSignatureRef.current = currentDraftSignature;
          const errorMessage = err instanceof Error ? err.message : t('tasks.saveFailedMessage', 'Could not write task markdown file to disk.');
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
    [title, dueDate, startedDate, completedDate, status, priority, area, project, tags, content, createOrUpdateTask, t]
  );

  handleSaveRef.current = handleSave;

  // Autosave when dirty
  useEffect(() => {
    if (!settings?.autoSave || !isDirty || isSaving || taskSaveError) return;

    const timer = setTimeout(() => {
      void handleSave();
    }, settings.autoSaveDelay ?? 1000);

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

  // Register task editor flush before app shutdown
  useEffect(() => {
    return registerTaskEditorFlush(async () => {
      if (!isDirty) return true;
      const saved = await handleSaveRef.current({ showNotification: false });
      return Boolean(saved);
    });
  }, [isDirty]);

  const handleLogToDaily = async () => {
    if (!title.trim()) return;
    setIsLogging(true);
    try {
      const taskToLog: TaskItem = persistedTaskRef.current || {
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
          message: title.trim(),
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

  const taskStatsForEditor = useMemo(() => {
    const matches = content.match(/^[ \t]*-[ \t]+\[([ xX])\]/gm) || [];
    const totalCount = matches.length;
    const completedCount = matches.filter((m) => /\[[xX]\]/.test(m)).length;
    return { total: totalCount, completed: completedCount };
  }, [content]);

  return (
    <div className={clsx(classes.container, 'task-view-container')}>
      {/* Header */}
      <TaskHeader
        activeTask={persistedTaskRef.current}
        title={title}
        onTitleChange={(val) => {
          setTitle(val);
          setIsDirty(true);
        }}
        isClosed={isClosed}
        isDark={isDark}
        area={area}
        project={project}
        priority={priority}
        dateBadgeText={dateBadgeText}
        currentAreaColor={currentAreaColor}
        currentProjectColor={currentProjectColor}
        layoutMode={taskEditorLayoutMode}
        onLayoutModeChange={setTaskEditorLayoutMode}
        isPropertiesPanelOpen={isTaskPropertiesPanelOpen}
        onTogglePropertiesPanel={toggleTaskPropertiesPanel}
        isDirty={isDirty}
        isSaving={isSaving}
        taskSaveError={taskSaveError}
        onSave={() => handleSave({ showNotification: true })}
        onBack={() => {
          void (async () => {
            if (isDirty && !(await handleSave({ showNotification: true }))) return;
            closeTaskEditor();
          })();
        }}
        onLogToDaily={handleLogToDaily}
        onExportClick={() => setIsExportModalOpen(true)}
        onOpenFileManager={persistedTaskRef.current?.filepath ? handleOpenFileInFileManager : undefined}
        onDeleteClick={() => setIsDeleteModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className={clsx(classes.workspace, 'task-workspace')}>
        <div className={clsx(classes.editorCanvas, 'task-editor-canvas')}>
          {taskEditorLayoutMode === 'split' && (
            <div className={clsx(classes.splitLayout, 'task-split-layout')}>
              <div className={clsx(classes.splitPane, 'task-split-pane')}>
                <MarkdownEditor
                  content={content}
                  onChange={(val) => {
                    setContent(val);
                    setIsDirty(true);
                  }}
                  onSave={() => handleSave({ showNotification: true })}
                  isSaving={isSaving}
                  isDirty={isDirty}
                  showStatusAndActions={false}
                  showTemplates={false}
                  showDelete={false}
                  showExport={false}
                  placeholder={t('tasks.contentPlaceholder', 'Add descriptions, checklists, technical specs, and acceptance criteria...')}
                  tasksStats={taskStatsForEditor}
                />
              </div>
              <div className={clsx(classes.splitPane, 'task-split-pane', classes.previewPane, 'task-preview-pane')}>
                <div className={clsx(classes.renderedContainer, 'task-rendered-container')}>
                  <MarkdownViewer
                    content={content || `_${t('tasks.noDescriptionProvided', 'No description provided')}_`}
                    allowToggleTasks={true}
                    onToggleTask={handleToggleTaskInContent}
                  />
                </div>
              </div>
            </div>
          )}

          {taskEditorLayoutMode === 'edit' && (
            <div style={{ height: '100%', width: '100%' }}>
              <MarkdownEditor
                content={content}
                onChange={(val) => {
                  setContent(val);
                  setIsDirty(true);
                }}
                onSave={() => handleSave({ showNotification: true })}
                isSaving={isSaving}
                isDirty={isDirty}
                showStatusAndActions={false}
                showTemplates={false}
                showDelete={false}
                showExport={false}
                placeholder={t('tasks.contentPlaceholder', 'Add descriptions, checklists, technical specs, and acceptance criteria...')}
                tasksStats={taskStatsForEditor}
              />
            </div>
          )}

          {taskEditorLayoutMode === 'preview' && (
            <div className={clsx(classes.previewOnlyContainer, 'task-preview-only-container')}>
              <div className={clsx(classes.renderedContainer, 'task-rendered-container')}>
                <MarkdownViewer
                  content={content || `_${t('tasks.noDescriptionProvided', 'No description provided')}_`}
                  allowToggleTasks={true}
                  onToggleTask={handleToggleTaskInContent}
                />
              </div>
            </div>
          )}
        </div>

        {/* Task Properties Inspector Sidebar */}
        {isTaskPropertiesPanelOpen && (
          <TaskInspector
            content={content}
            area={area}
            onAreaChange={(val) => {
              setArea(val);
              setIsDirty(true);
            }}
            project={project}
            onProjectChange={(val) => {
              setProject(val);
              setIsDirty(true);
            }}
            status={status}
            onStatusChange={handleStatusChange}
            priority={priority}
            onPriorityChange={(val) => {
              setPriority(val);
              setIsDirty(true);
            }}
            dueDate={dueDate}
            onDueDateChange={(val) => {
              setDueDate(val);
              setIsDirty(true);
            }}
            startedDate={startedDate}
            onStartedDateChange={(val) => {
              setStartedDate(val);
              setIsDirty(true);
            }}
            completedDate={completedDate}
            onCompletedDateChange={(val) => {
              setCompletedDate(val);
              setIsDirty(true);
            }}
            tags={tags}
            onTagsChange={(val) => {
              setTags(val);
              setIsDirty(true);
            }}
            areas={areas}
            projects={projects}
            availableColumns={availableColumns}
            allTags={allTags}
            isLogging={isLogging}
            onLogToDaily={handleLogToDaily}
            onExportClick={() => setIsExportModalOpen(true)}
            onOpenFileManager={persistedTaskRef.current?.filepath ? handleOpenFileInFileManager : undefined}
            onDeleteClick={() => setIsDeleteModalOpen(true)}
            onScrollToHeading={handleScrollToHeading}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <TaskDeleteModal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDelete}
        isSaving={isSaving}
        taskTitle={title || persistedTaskRef.current?.title || ''}
        filename={persistedTaskRef.current?.filename}
      />

      {/* Export Modal */}
      <ExportModal
        opened={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={title || persistedTaskRef.current?.title || 'Export Task'}
        content={content}
        defaultFileName={persistedTaskRef.current?.filename ? persistedTaskRef.current.filename.replace(/\.md$/, '') : `task-${persistedTaskRef.current?.taskId || 'export'}`}
      />
    </div>
  );
};
