import React from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendarStats,
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

  const navItems: Array<{ value: AppViewMode; labelKey: string; icon: any }> = [
    { value: 'daily', labelKey: 'nav.daily', icon: IconCalendarEvent },
    { value: 'weekly', labelKey: 'nav.weekly', icon: IconCalendarWeek },
    { value: 'monthly', labelKey: 'nav.monthly', icon: IconCalendarMonth },
    { value: 'yearly', labelKey: 'nav.yearly', icon: IconCalendarStats },
  ];

  const isTasksActive = currentView === 'tasks' || currentView === 'task';

  return (
    <Group
      h="100%"
      px="md"
      pl={isMac ? 82 : 'md'}
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
      <Group gap="xs" wrap="nowrap" className="app-no-drag" style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: 'var(--mantine-primary-color-filled)',
            color: '#fff',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
          }}
        >
          <IconBook2 size={17} stroke={2.2} />
        </div>
        <Text
          fw={800}
          size="sm"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          Daily Worklog
        </Text>
      </Group>

      {/* Center View Selector: Worklog (Día, Semana, Mes, Año) + Tareas */}
      <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 14 }}>
        <Group gap={6} align="center" wrap="nowrap">
          <Text size="xs" fw={500} c="dimmed" style={{ letterSpacing: '0.01em', marginRight: 4 }}>
            {t('nav.worklog', 'Worklog')}:
          </Text>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.value;
            return (
              <UnstyledButton
                key={item.value}
                onClick={() => setCurrentView(item.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--mantine-primary-color-filled)' : 'var(--app-text-secondary)',
                  backgroundColor: isActive ? 'var(--mantine-primary-color-light)' : 'transparent',
                  border: isActive ? '1.5px solid var(--mantine-primary-color-filled)' : '1.5px solid transparent',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <Icon size={15} stroke={isActive ? 2.2 : 1.8} />
                <span>{t(item.labelKey)}</span>
              </UnstyledButton>
            );
          })}
        </Group>

        {/* Standalone Tasks button */}
        <UnstyledButton
          onClick={() => setCurrentView('tasks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: isTasksActive ? 600 : 500,
            color: isTasksActive ? 'var(--mantine-primary-color-filled)' : 'var(--app-text-secondary)',
            backgroundColor: isTasksActive ? 'var(--mantine-primary-color-light)' : 'transparent',
            border: isTasksActive ? '1.5px solid var(--mantine-primary-color-filled)' : '1.5px solid transparent',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <IconCheckbox size={15} stroke={isTasksActive ? 2.2 : 1.8} />
          <span>{t('nav.tasks')}</span>
        </UnstyledButton>
      </div>

      {/* Right Controls: Settings */}
      <Group gap={8} wrap="nowrap" className="app-no-drag" style={{ flexShrink: 0 }}>
        {/* Settings Button */}
        <Tooltip label={t('settings.title')} withArrow position="bottom">
          <ActionIcon
            variant="subtle"
            size={30}
            radius="md"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
          >
            <IconSettings size={17} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
};


