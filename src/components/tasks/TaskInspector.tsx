import React, { useState } from 'react';
import {
  ScrollArea,
  Stack,
  UnstyledButton,
  Group,
  Text,
  Collapse,
  Button,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconTag,
  IconListTree,
  IconCalendarPlus,
  IconFileExport,
  IconFolderOpen,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  AreaDefinition,
  KanbanColumnConfig,
  ProjectDefinition,
  TagDefinition,
  TaskPriority,
  TaskStatus,
} from '../../types';
import { TaskChecklistProgress } from './TaskChecklistProgress';
import { TaskPropertiesForm } from './TaskPropertiesForm';
import { TaskOutline } from './TaskOutline';
import { TaskRelations } from './TaskRelations';
import classes from '../views/TaskView.module.css';

export interface TaskInspectorProps {
  content: string;
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
  onScrollToHeading: (id: string) => void;
  taskId?: number;
}

export const TaskInspector: React.FC<TaskInspectorProps> = ({
  content,
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
  taskId,
}) => {
  const { t } = useTranslation();

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  return (
    <div className={clsx(classes.inspectorPanel, 'task-inspector-panel')}>
      <div className={clsx(classes.inspectorHeader, 'task-inspector-header')}>
        <Text
          size="xs"
          fw={700}
          style={{
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--app-text-secondary)',
          }}
        >
          {t('tasks.properties', 'Task Properties')}
        </Text>
      </div>

      <ScrollArea style={{ flex: 1 }} p="md" offsetScrollbars>
        {/* Checklist Progress */}
        <div className={clsx(classes.inspectorSection, 'task-inspector-section')}>
          <TaskChecklistProgress content={content} />
        </div>

        {/* Parent task & subtasks */}
        <TaskRelations taskId={taskId} />

        {/* Task Properties & Metadata */}
        <div className={clsx(classes.inspectorSection, 'task-inspector-section')}>
          <UnstyledButton
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isPropertiesOpen ? 8 : 0,
            }}
          >
            <Group gap={6}>
              <IconTag size={14} style={{ color: 'var(--app-text-secondary)' }} />
              <Text
                size="xs"
                fw={700}
                style={{
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {t('tasks.sectionProperties', 'Properties')}
              </Text>
            </Group>
            {isPropertiesOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
          </UnstyledButton>

          <Collapse in={isPropertiesOpen}>
            <TaskPropertiesForm
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
            />
          </Collapse>
        </div>

        {/* Document Outline */}
        <div className={clsx(classes.inspectorSection, 'task-inspector-section')}>
          <UnstyledButton
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isOutlineOpen ? 8 : 0,
            }}
          >
            <Group gap={6}>
              <IconListTree size={14} style={{ color: 'var(--app-text-secondary)' }} />
              <Text
                size="xs"
                fw={700}
                style={{
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {t('tasks.outline', 'Outline')}
              </Text>
            </Group>
            {isOutlineOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
          </UnstyledButton>

          <Collapse in={isOutlineOpen}>
            <TaskOutline content={content} onScrollToHeading={onScrollToHeading} />
          </Collapse>
        </div>

        {/* Actions & Storage */}
        <div
          className={clsx(classes.inspectorSection, 'task-inspector-section')}
          style={{ borderBottom: 'none' }}
        >
          <UnstyledButton
            onClick={() => setIsActionsOpen(!isActionsOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isActionsOpen ? 8 : 0,
            }}
          >
            <Group gap={6}>
              <Text
                size="xs"
                fw={700}
                style={{
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: 'var(--app-text-secondary)',
                }}
              >
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
                onClick={onLogToDaily}
              >
                {t('tasks.logToDailyNote')}
              </Button>

              <Button
                variant="default"
                size="xs"
                radius="md"
                leftSection={<IconFileExport size={14} />}
                onClick={onExportClick}
              >
                {t('editor.exportNote')}
              </Button>

              {onOpenFileManager && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  radius="md"
                  leftSection={<IconFolderOpen size={14} />}
                  onClick={onOpenFileManager}
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
                onClick={onDeleteClick}
              >
                {t('tasks.deleteTask')}
              </Button>
            </Stack>
          </Collapse>
        </div>
      </ScrollArea>
    </div>
  );
};
