import React from 'react';
import {
  Group,
  SegmentedControl,
  Button,
  ActionIcon,
  Tooltip,
  Menu,
  Text,
  Loader,
} from '@mantine/core';
import {
  IconDeviceFloppy,
  IconDotsVertical,
  IconFileExport,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconCircleFilled,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import classes from './MarkdownEditor.module.css';

export interface EditorHeaderActionsProps {
  layoutMode?: 'live' | 'split' | 'edit' | 'preview';
  onLayoutModeChange?: (mode: 'live' | 'split' | 'edit' | 'preview') => void;
  isSaving: boolean;
  isDirty: boolean;
  saveError: string | null;
  showSavedConfirmation: boolean;
  onSave: () => Promise<unknown> | unknown;
  showExport?: boolean;
  onExportClick?: () => void;
  showDelete?: boolean;
  onDeleteClick?: () => void;
}

export const EditorHeaderActions: React.FC<EditorHeaderActionsProps> = ({
  layoutMode,
  onLayoutModeChange,
  isSaving,
  isDirty,
  saveError,
  showSavedConfirmation,
  onSave,
  showExport = true,
  onExportClick,
  showDelete = true,
  onDeleteClick,
}) => {
  const { t } = useTranslation();

  return (
    <Group gap={8} wrap="nowrap">
      {layoutMode && onLayoutModeChange && (
        <SegmentedControl
          value={layoutMode}
          onChange={(val: string) =>
            onLayoutModeChange(val as 'live' | 'split' | 'edit' | 'preview')
          }
          size="xs"
          radius="md"
          className={clsx(classes.navSegmentedControl, 'nav-segmented-control')}
          transitionDuration={180}
          data={[
            { label: t('editor.live'), value: 'live' },
            { label: t('editor.split'), value: 'split' },
            { label: t('editor.write'), value: 'edit' },
            { label: t('editor.preview'), value: 'preview' },
          ]}
        />
      )}

      <Group
        gap={5}
        wrap="nowrap"
        role="status"
        aria-live="polite"
        className={clsx(classes.noteSaveStatus, 'note-save-status')}
      >
        {saveError ? (
          <Button
            variant="subtle"
            color="red"
            size="compact-xs"
            leftSection={<IconAlertCircle size={14} />}
            onClick={() => void onSave()}
          >
            {t('editor.retrySave')}
          </Button>
        ) : isSaving ? (
          <>
            <Loader size={13} color="gray" />
            <Text
              size="xs"
              c="dimmed"
              className={clsx(classes.noteSaveStatusLabel, 'note-save-status-label')}
            >
              {t('editor.saving')}
            </Text>
          </>
        ) : isDirty ? (
          <>
            <IconCircleFilled
              size={8}
              className={clsx(classes.noteSaveStatusUnsaved, 'note-save-status-unsaved')}
            />
            <Text
              size="xs"
              c="dimmed"
              className={clsx(classes.noteSaveStatusLabel, 'note-save-status-label')}
            >
              {t('editor.unsaved')}
            </Text>
          </>
        ) : (
          <Tooltip label={t('editor.saved')} withArrow>
            <Group gap={5} wrap="nowrap">
              <IconCheck
                size={16}
                className={clsx(classes.noteSaveStatusSaved, 'note-save-status-saved')}
              />
              {showSavedConfirmation && (
                <Text
                  size="xs"
                  c="dimmed"
                  className={clsx(classes.noteSaveStatusLabel, 'note-save-status-label')}
                >
                  {t('editor.saved')}
                </Text>
              )}
            </Group>
          </Tooltip>
        )}
      </Group>

      {/* 3-dots actions menu */}
      <Menu position="bottom-end" shadow="md" withinPortal>
        <Menu.Target>
          <ActionIcon
            aria-label={t('editor.moreActions')}
            variant="subtle"
            size="sm"
            color="gray"
          >
            <IconDotsVertical size={15} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={() => void onSave()}
            disabled={!isDirty}
          >
            {t('common.save')}
          </Menu.Item>
          {showExport && onExportClick && (
            <Menu.Item
              leftSection={<IconFileExport size={14} />}
              onClick={onExportClick}
            >
              {t('editor.exportNote')}
            </Menu.Item>
          )}
          {showDelete && onDeleteClick && (
            <>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={onDeleteClick}
              >
                {t('common.delete')}
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
