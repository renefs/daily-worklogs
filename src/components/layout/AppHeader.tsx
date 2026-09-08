import React from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Text,
  UnstyledButton,
  SegmentedControl,
} from '@mantine/core';
import {
  IconCheckbox,
  IconSettings,
  IconBook2,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAppStoreSelector } from '../../store/useAppStore';
import { AppViewMode } from '../../types';
import classes from './AppHeader.module.css';

export const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentView,
    setCurrentView,
    setIsSettingsOpen,
  } = useAppStoreSelector((state) => ({
    currentView: state.currentView,
    setCurrentView: state.setCurrentView,
    setIsSettingsOpen: state.setIsSettingsOpen,
  }));

  const isMac =
    typeof window !== 'undefined' &&
    (window.electronAPI?.platform === 'darwin' ||
      /Macintosh|Mac OS X/i.test(navigator.userAgent));

  const isTasksActive = currentView === 'tasks' || currentView === 'task';
  const isTimeViewActive = ['daily', 'weekly', 'monthly', 'yearly'].includes(currentView);

  return (
    <Group
      h="100%"
      px="sm"
      pl={isMac ? 80 : 'sm'}
      align="center"
      justify="space-between"
      wrap="nowrap"
      className={clsx('app-drag-region', classes.headerGroup)}
    >
      {/* App Branding */}
      <Group gap={8} wrap="nowrap" align="center" className="app-no-drag" style={{ flexShrink: 0 }}>
        <div className={classes.brandingIcon}>
          <IconBook2 size={15} stroke={2.2} />
        </div>
        <Text
          fw={700}
          size="sm"
          className={classes.brandingTitle}
        >
          Worklog
        </Text>
      </Group>

      {/* Center View Selector: Compact Segmented Time Navigation + Visually Separated Tasks */}
      <div className={clsx('app-no-drag', classes.centerNav)}>
        <SegmentedControl
          value={isTimeViewActive ? currentView : ''}
          onChange={(val: string) => {
            if (val) setCurrentView(val as AppViewMode);
          }}
          size="xs"
          radius="md"
          className={clsx(classes.segmentedControl, 'header-segmented-control')}
          transitionDuration={160}
          data={[
            { label: t('nav.daily'), value: 'daily' },
            { label: t('nav.weekly'), value: 'weekly' },
            { label: t('nav.monthly'), value: 'monthly' },
            { label: t('nav.yearly'), value: 'yearly' },
          ]}
        />

        {/* Visual separator before Tasks */}
        <div className={classes.tasksSeparator} />

        {/* Visually separated Tasks button */}
        <UnstyledButton
          onClick={() => setCurrentView('tasks')}
          className={clsx(classes.tasksButton, 'header-tasks-button')}
          data-active={isTasksActive ? 'true' : undefined}
        >
          <IconCheckbox size={14} stroke={isTasksActive ? 2.2 : 1.8} />
          <span>{t('nav.tasks')}</span>
        </UnstyledButton>
      </div>

      {/* Right Controls: Settings with muted styling */}
      <Group gap={6} wrap="nowrap" align="center" className="app-no-drag" style={{ flexShrink: 0 }}>
        <Tooltip label={t('settings.title')} withArrow position="bottom">
          <ActionIcon
            variant="subtle"
            size={28}
            radius="md"
            color="gray"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            className={classes.settingsButton}
          >
            <IconSettings size={16} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};

