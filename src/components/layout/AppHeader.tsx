import React from 'react';
import {
  Group,
  Button,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendar,
  IconSettings,
  IconSun,
  IconMoon,
  IconBook2,
  IconLanguage,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { AppViewMode } from '../../types';

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const {
    currentView,
    setCurrentView,
    setIsSettingsOpen,
    updateSettings,
  } = useAppStore();

  const isMac =
    typeof window !== 'undefined' &&
    (window.electronAPI?.platform === 'darwin' ||
      /Macintosh|Mac OS X/i.test(navigator.userAgent));

  const handleToggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    updateSettings({ language: nextLang });
  };

  return (
    <Group
      h="100%"
      px="md"
      pl={isMac ? 82 : 'md'}
      justify="space-between"
      wrap="nowrap"
      className="app-drag-region"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-body)',
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

      {/* Center View Selector Tabs */}
      <div className="app-no-drag" style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <SegmentedControl
          value={currentView}
          onChange={(val) => setCurrentView(val as AppViewMode)}
          size="xs"
          radius="md"
          className="nav-segmented-control"
          transitionDuration={180}
          data={[
            {
              value: 'daily',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconCalendarEvent size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.daily')}</span>
                </Group>
              ),
            },
            {
              value: 'weekly',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconCalendarWeek size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.weekly')}</span>
                </Group>
              ),
            },
            {
              value: 'monthly',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconCalendarMonth size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.monthly')}</span>
                </Group>
              ),
            },
            {
              value: 'calendar',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconCalendar size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.calendar')}</span>
                </Group>
              ),
            },
          ]}
        />
      </div>

      {/* Right Controls: Language, Theme, Settings */}
      <Group gap={8} wrap="nowrap" className="app-no-drag" style={{ flexShrink: 0 }}>
        {/* Language Quick Toggle */}
        <Tooltip label={i18n.language === 'en' ? 'Cambiar a Español' : 'Switch to English'} withArrow position="bottom">
          <Button
            variant="subtle"
            size="xs"
            px={8}
            h={30}
            leftSection={<IconLanguage size={15} stroke={1.8} />}
            onClick={handleToggleLanguage}
            radius="md"
            style={{ fontWeight: 600, fontSize: 12 }}
          >
            {i18n.language.toUpperCase()}
          </Button>
        </Tooltip>

        {/* Dark/Light Mode */}
        <Tooltip label={colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'} withArrow position="bottom">
          <ActionIcon
            variant="subtle"
            size={30}
            radius="md"
            onClick={() => toggleColorScheme()}
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <IconSun size={17} stroke={1.8} /> : <IconMoon size={17} stroke={1.8} />}
          </ActionIcon>
        </Tooltip>

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
