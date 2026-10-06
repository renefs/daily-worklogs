import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MarkdownEditor } from '../../editor/MarkdownEditor';
import { MarkdownViewer } from '../../viewer/MarkdownViewer';
import { TaskInspector } from '../../tasks/TaskInspector';
import {
  AreaDefinition,
  ProjectDefinition,
  KanbanColumnConfig,
  TagDefinition,
  TaskPriority,
  TaskStatus,
} from '../../../types';
import classes from '../TaskView.module.css';

export interface TaskWorkspaceProps {
  layoutMode: 'live' | 'split' | 'edit' | 'preview';
  content: string;
  onContentChange: (val: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
  taskStats: { total: number; completed: number };
  onToggleTaskInContent: (taskText: string, checked: boolean) => void;
  isPropertiesPanelOpen: boolean;
  area: string;
  onAreaChange: (val: string) => void;
  project: string | null;
  onProjectChange: (val: string | null) => void;
  status: TaskStatus;
  onStatusChange: (val: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (val: TaskPriority) => void;
  dueDate: Date | null;
  onDueDateChange: (val: Date | null) => void;
  startedDate: Date | null;
  onStartedDateChange: (val: Date | null) => void;
  completedDate: Date | null;
  onCompletedDateChange: (val: Date | null) => void;
  tags: string[];
  onTagsChange: (val: string[]) => void;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  availableColumns: KanbanColumnConfig[];
  allTags: TagDefinition[];
  isLogging: boolean;
  onLogToDaily: () => void;
  onExportClick: () => void;
  onOpenFileManager?: () => void;
  onDeleteClick: () => void;
  onScrollToHeading: (headingText: string) => void;
}

export const TaskWorkspace: React.FC<TaskWorkspaceProps> = ({
  layoutMode,
  content,
  onContentChange,
  onSave,
  isSaving,
  isDirty,
  taskStats,
  onToggleTaskInContent,
  isPropertiesPanelOpen,
  area,
  onAreaChange,
  project,
  onProjectChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  startedDate,
  onStartedDateChange,
  completedDate,
  onCompletedDateChange,
  tags,
  onTagsChange,
  areas,
  projects,
  availableColumns,
  allTags,
  isLogging,
  onLogToDaily,
  onExportClick,
  onOpenFileManager,
  onDeleteClick,
  onScrollToHeading,
}) => {
  const { t } = useTranslation();

  return (
    <div className={clsx(classes.workspace, 'task-workspace')}>
      <div className={clsx(classes.editorCanvas, 'task-editor-canvas')}>
        {layoutMode === 'split' && (
          <div className={clsx(classes.splitLayout, 'task-split-layout')}>
            <div className={clsx(classes.splitPane, 'task-split-pane')}>
              <MarkdownEditor
                content={content}
                onChange={onContentChange}
                onSave={onSave}
                isSaving={isSaving}
                isDirty={isDirty}
                showStatusAndActions={false}
                showTemplates={false}
                showDelete={false}
                showExport={false}
                placeholder={t('tasks.contentPlaceholder', 'Add descriptions, checklists, technical specs, and acceptance criteria...')}
                tasksStats={taskStats}
              />
            </div>
            <div className={clsx(classes.splitPane, 'task-split-pane', classes.previewPane, 'task-preview-pane')}>
              <div className={clsx(classes.renderedContainer, 'task-rendered-container')}>
                <MarkdownViewer
                  content={content || `_${t('tasks.noDescriptionProvided', 'No description provided')}_`}
                  allowToggleTasks={true}
                  onToggleTask={onToggleTaskInContent}
                />
              </div>
            </div>
          </div>
        )}

        {layoutMode === 'edit' && (
          <div style={{ height: '100%', width: '100%' }}>
            <MarkdownEditor
              content={content}
              onChange={onContentChange}
              onSave={onSave}
              isSaving={isSaving}
              isDirty={isDirty}
              isLivePreview={false}
              showStatusAndActions={false}
              showTemplates={false}
              showDelete={false}
              showExport={false}
              placeholder={t('tasks.contentPlaceholder', 'Add descriptions, checklists, technical specs, and acceptance criteria...')}
              tasksStats={taskStats}
            />
          </div>
        )}

        {layoutMode === 'preview' && (
          <div className={clsx(classes.previewOnlyContainer, 'task-preview-only-container')}>
            <div className={clsx(classes.renderedContainer, 'task-rendered-container')}>
              <MarkdownViewer
                content={content || `_${t('tasks.noDescriptionProvided', 'No description provided')}_`}
                allowToggleTasks={true}
                onToggleTask={onToggleTaskInContent}
              />
            </div>
          </div>
        )}

        {layoutMode === 'live' && (
          <div style={{ height: '100%', width: '100%' }}>
            <MarkdownEditor
              content={content}
              onChange={onContentChange}
              onSave={onSave}
              isSaving={isSaving}
              isDirty={isDirty}
              isLivePreview={true}
              showStatusAndActions={false}
              showTemplates={false}
              showDelete={false}
              showExport={false}
              placeholder={t('tasks.contentPlaceholder', 'Add descriptions, checklists, technical specs, and acceptance criteria...')}
              tasksStats={taskStats}
            />
          </div>
        )}
      </div>

      {/* Task Properties Inspector Sidebar */}
      {isPropertiesPanelOpen && (
        <TaskInspector
          content={content}
          area={area}
          onAreaChange={onAreaChange}
          project={project}
          onProjectChange={onProjectChange}
          status={status}
          onStatusChange={onStatusChange}
          priority={priority}
          onPriorityChange={onPriorityChange}
          dueDate={dueDate}
          onDueDateChange={onDueDateChange}
          startedDate={startedDate}
          onStartedDateChange={onStartedDateChange}
          completedDate={completedDate}
          onCompletedDateChange={onCompletedDateChange}
          tags={tags}
          onTagsChange={onTagsChange}
          areas={areas}
          projects={projects}
          availableColumns={availableColumns}
          allTags={allTags}
          isLogging={isLogging}
          onLogToDaily={onLogToDaily}
          onExportClick={onExportClick}
          onOpenFileManager={onOpenFileManager}
          onDeleteClick={onDeleteClick}
          onScrollToHeading={onScrollToHeading}
        />
      )}
    </div>
  );
};
