import React from 'react';
import {
  Group,
  TextInput,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Button,
  SegmentedControl,
  Menu,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconDotsVertical,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconSparkles,
  IconColumns,
  IconWriting,
  IconEye,
  IconCalendarPlus,
  IconFileExport,
  IconFolderOpen,
  IconTrash,
  IconFolder,
  IconAlertCircle,
  IconCircleFilled,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TaskItem, TaskPriority } from '../../types';
import classes from '../views/TaskView.module.css';

export interface TaskHeaderProps {
  activeTask: TaskItem | null;
  title: string;
  onTitleChange: (title: string) => void;
  isClosed: boolean;
  isDark: boolean;
  area: string;
  project: string | null;
  priority: TaskPriority;
  dateBadgeText: string | null;
  currentAreaColor: string;
  currentProjectColor: string;
  layoutMode: 'live' | 'split' | 'edit' | 'preview';
  onLayoutModeChange: (mode: 'live' | 'split' | 'edit' | 'preview') => void;
  isPropertiesPanelOpen: boolean;
  onTogglePropertiesPanel: () => void;
  isDirty: boolean;
  isSaving: boolean;
  taskSaveError: string | null;
  onSave: () => Promise<unknown> | unknown;
  onBack: () => void;
  onLogToDaily: () => void;
  onExportClick: () => void;
  onOpenFileManager?: () => void;
  onDeleteClick: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  activeTask,
  title,
  onTitleChange,
  isClosed,
  isDark,
  area,
  project,
  priority,
  dateBadgeText,
  currentAreaColor,
  currentProjectColor,
  layoutMode,
  onLayoutModeChange,
  isPropertiesPanelOpen,
  onTogglePropertiesPanel,
  isDirty,
  isSaving,
  taskSaveError,
  onSave,
  onBack,
  onLogToDaily,
  onExportClick,
  onOpenFileManager,
  onDeleteClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className={clsx(classes.headerUnified, 'task-header-unified')}>
      <div className={clsx(classes.headerPrimary, 'task-header-primary')}>
        <div className={clsx(classes.titleGroup, 'task-header-title-group')}>
          <Tooltip label={t('tasks.backToTasks')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={onBack}
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

          {/* Task Title Input */}
          <TextInput
            value={title}
            onChange={(e) => onTitleChange(e.currentTarget.value)}
            placeholder={t('tasks.titlePlaceholder', 'What needs to be done?')}
            variant="unstyled"
            className={clsx(classes.titleInput, 'task-title-input')}
            styles={{
              root: { flex: 1, minWidth: 0 },
              wrapper: { width: '100%' },
              input: {
                width: '100%',
                fontSize: 20,
                fontWeight: 750,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-display)',
                color: isDark ? 'var(--mantine-color-white)' : 'var(--mantine-color-dark-9)',
                padding: '2px 4px',
                height: 'auto',
                textDecoration: isClosed ? 'line-through' : 'none',
              },
            }}
          />
        </div>

        {/* Secondary Context & Action Bar */}
        <div className={clsx(classes.headerMetaRow, 'task-header-meta-row')}>
          <div className={clsx(classes.contextGroup, 'task-header-context-group')}>
            {area && (
              <Badge
                size="sm"
                variant="light"
                color={currentAreaColor}
                radius="sm"
                leftSection={<IconFolder size={11} />}
              >
                {area}
              </Badge>
            )}

            {project && (
              <Badge
                size="sm"
                variant="outline"
                color={currentProjectColor}
                radius="sm"
              >
                {project}
              </Badge>
            )}

            <Badge
              size="sm"
              variant="dot"
              color={
                priority === 'urgent'
                  ? 'red'
                  : priority === 'high'
                  ? 'orange'
                  : priority === 'medium'
                  ? 'blue'
                  : 'gray'
              }
              radius="sm"
            >
              {t(`tasks.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`)}
            </Badge>

            {dateBadgeText && (
              <Text size="xs" c="dimmed">
                {dateBadgeText}
              </Text>
            )}
          </div>

          <div className={clsx(classes.headerControls, 'task-header-controls')}>
            {/* View Mode Switcher */}
            <SegmentedControl
              value={layoutMode}
              onChange={(val) => onLayoutModeChange(val as 'live' | 'split' | 'edit' | 'preview')}
              size="xs"
              radius="md"
              className={clsx(classes.navSegmentedControl, 'nav-segmented-control')}
              transitionDuration={180}
              data={[
                {
                  value: 'live',
                  label: (
                    <Group gap={4} wrap="nowrap">
                      <IconSparkles size={13} />
                      <span>{t('editor.live', 'Live')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'split',
                  label: (
                    <Group gap={4} wrap="nowrap">
                      <IconColumns size={13} />
                      <span>{t('editor.split', 'Split')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'edit',
                  label: (
                    <Group gap={4} wrap="nowrap">
                      <IconWriting size={13} />
                      <span>{t('editor.write', 'Editor')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'preview',
                  label: (
                    <Group gap={4} wrap="nowrap">
                      <IconEye size={13} />
                      <span>{t('editor.preview', 'Preview')}</span>
                    </Group>
                  ),
                },
              ]}
            />

            {/* Toggle Properties Panel */}
            <Tooltip
              label={
                isPropertiesPanelOpen
                  ? t('tasks.hideProperties', 'Hide properties')
                  : t('tasks.showProperties', 'Show properties')
              }
              withArrow
            >
              <ActionIcon
                variant={isPropertiesPanelOpen ? 'light' : 'subtle'}
                color={isPropertiesPanelOpen ? 'primary' : 'gray'}
                size="md"
                radius="md"
                onClick={onTogglePropertiesPanel}
              >
                {isPropertiesPanelOpen ? (
                  <IconLayoutSidebarRightCollapse size={16} />
                ) : (
                  <IconLayoutSidebarRight size={16} />
                )}
              </ActionIcon>
            </Tooltip>

            {/* Save Status & Button */}
            {taskSaveError ? (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconAlertCircle size={14} />}
                onClick={() => void onSave()}
              >
                {t('editor.retrySave')}
              </Button>
            ) : isDirty ? (
              <Button
                variant="filled"
                color="primary"
                size="xs"
                radius="md"
                leftSection={<IconDeviceFloppy size={14} />}
                loading={isSaving}
                onClick={() => void onSave()}
              >
                {t('common.save')}
              </Button>
            ) : (
              <Badge variant="subtle" color="gray" size="sm">
                <Group gap={4}>
                  <IconCircleFilled size={6} color="var(--mantine-color-teal-6)" />
                  <span>{t('editor.saved', 'Saved')}</span>
                </Group>
              </Badge>
            )}

            {/* Menu */}
            <Menu position="bottom-end" shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="md" radius="md">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconCalendarPlus size={14} />}
                  onClick={onLogToDaily}
                >
                  {t('tasks.logToDailyNote')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileExport size={14} />}
                  onClick={onExportClick}
                >
                  {t('editor.exportNote')}
                </Menu.Item>
                {onOpenFileManager && (
                  <Menu.Item
                    leftSection={<IconFolderOpen size={14} />}
                    onClick={onOpenFileManager}
                  >
                    {t('tasks.openInFileManager')}
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={onDeleteClick}
                >
                  {t('tasks.deleteTask')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  );
};
