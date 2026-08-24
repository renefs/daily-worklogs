import {
  Group,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  Text,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendarStats,
  IconLayoutKanban,
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
              value: 'yearly',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconCalendarStats size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.yearly')}</span>
                </Group>
              ),
            },
            {
              value: 'tasks',
              label: (
                <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <IconLayoutKanban size={15} stroke={1.8} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t('nav.tasks')}</span>
                </Group>
              ),
            },
          ]}
        />
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
