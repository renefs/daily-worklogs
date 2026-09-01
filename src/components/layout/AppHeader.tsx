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
import { useAppStore } from '../../store/useAppStore';
import { AppViewMode } from '../../types';

export const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentView,
    setCurrentView,
    setIsSettingsOpen,
  } = useAppStore();

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
      className="app-drag-region"
      style={{
        borderBottom: '1px solid var(--app-header-border)',
        backgroundColor: 'var(--app-header-bg)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* App Branding */}
      <Group gap={8} wrap="nowrap" align="center" className="app-no-drag" style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: 'var(--mantine-primary-color-filled)',
            color: '#fff',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
          }}
        >
          <IconBook2 size={15} stroke={2.2} />
        </div>
        <Text
          fw={700}
          size="sm"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            fontSize: 13.5,
          }}
        >
          Worklog
        </Text>
      </Group>

      {/* Center View Selector: Compact Segmented Time Navigation + Visually Separated Tasks */}
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <SegmentedControl
          value={isTimeViewActive ? currentView : ''}
          onChange={(val: string) => {
            if (val) setCurrentView(val as AppViewMode);
          }}
          size="xs"
          radius="md"
          className="header-segmented-control"
          transitionDuration={160}
          data={[
            { label: t('nav.daily'), value: 'daily' },
            { label: t('nav.weekly'), value: 'weekly' },
            { label: t('nav.monthly'), value: 'monthly' },
            { label: t('nav.yearly'), value: 'yearly' },
          ]}
        />

        {/* Visual separator before Tasks */}
        <div
          style={{
            width: 1,
            height: 16,
            backgroundColor: 'var(--app-header-border)',
            margin: '0 2px',
          }}
        />

        {/* Visually separated Tasks button */}
        <UnstyledButton
          onClick={() => setCurrentView('tasks')}
          className="header-tasks-button"
          data-active={isTasksActive ? 'true' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: isTasksActive ? 600 : 500,
            color: isTasksActive ? 'var(--mantine-primary-color-filled)' : 'var(--app-text-secondary)',
            backgroundColor: isTasksActive ? 'var(--mantine-primary-color-light)' : 'transparent',
            border: isTasksActive ? '1px solid var(--mantine-primary-color-filled)' : '1px solid transparent',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            userSelect: 'none',
          }}
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
            style={{ color: 'var(--app-sidebar-text-dimmed)' }}
          >
            <IconSettings size={16} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};


