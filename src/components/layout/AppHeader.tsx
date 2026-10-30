import { Group, ActionIcon, Tooltip, Text, Button, Badge } from '@mantine/core';
import { IconSettings, IconBook2, IconChecklist } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useAppStoreSelector } from '../../store/useAppStore';
import { SidebarNavigation } from './SidebarNavigation';
import classes from './AppHeader.module.css';

export function AppHeader() {
  const { t } = useTranslation();
  const {
    settings,
    routineCompletionsByDate,
    selectedDate,
    currentView,
    isRoutinesDrawerOpen,
    toggleRoutinesDrawer,
    openSettings,
  } = useAppStoreSelector((s) => ({
    settings: s.settings,
    routineCompletionsByDate: s.routineCompletionsByDate,
    selectedDate: s.selectedDate,
    currentView: s.currentView,
    isRoutinesDrawerOpen: s.isRoutinesDrawerOpen,
    toggleRoutinesDrawer: s.toggleRoutinesDrawer,
    openSettings: s.openSettings,
  }));

  const isMac = typeof window !== 'undefined' && (window.electronAPI?.platform === 'darwin' || /Macintosh|Mac OS X/i.test(navigator.userAgent));

  const targetDate = currentView === 'daily' ? selectedDate : dayjs().format('YYYY-MM-DD');
  const dayObj = dayjs(targetDate);
  const currentDayOfWeek = dayObj.day();
  const allRoutines = settings?.routines || [];
  const activeRoutines = allRoutines.filter((r) => {
    if (!r.enabled) return false;
    if (r.schedule === 'everyday') return true;
    if (r.schedule === 'weekdays') return currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
    if (Array.isArray(r.schedule)) return r.schedule.includes(currentDayOfWeek);
    return true;
  });
  const completedIds = routineCompletionsByDate[targetDate] || [];
  const totalCount = activeRoutines.length;
  const completedCount = activeRoutines.filter((r) => completedIds.includes(r.id)).length;
  const isAllDone = totalCount > 0 && completedCount === totalCount;
  const shortcutHint = isMac ? '⌘⇧R' : 'Ctrl+Shift+R';
  const isRoutinesEnabled = settings?.enableDailyRoutines !== false;

  return (
    <Group
      h="100%"
      align="center"
      justify="space-between"
      wrap="nowrap"
      data-mac={isMac || undefined}
      className={clsx('app-drag-region', classes.headerGroup)}
    >
      <Group gap={8} wrap="nowrap" className="app-no-drag">
        <div className={classes.brandingIcon}><IconBook2 size={15} /></div>
        <Text fw={600} size="sm" className={classes.brandingTitle}>{t('nav.brand')}</Text>
      </Group>

      <div className={clsx('app-no-drag', classes.mobileNavigation)}>
        <SidebarNavigation horizontal />
      </div>

      <Group gap="xs" wrap="nowrap" className="app-no-drag">
        {isRoutinesEnabled && (
          <Tooltip label={`${t('routines.panelTitle')} (${shortcutHint})`}>
            <Button
              variant={isRoutinesDrawerOpen ? 'light' : 'subtle'}
              color={isAllDone ? 'teal' : 'gray'}
              size="xs"
              radius="md"
              leftSection={<IconChecklist size={16} />}
              onClick={() => toggleRoutinesDrawer()}
              styles={{
                root: { fontWeight: 500 },
              }}
            >
              <span className={classes.routinesButtonLabel}>{t('routines.panelTitle')}</span>
              {totalCount > 0 && (
                <Badge
                  size="xs"
                  variant={isAllDone ? 'filled' : 'light'}
                  color={isAllDone ? 'teal' : 'blue'}
                  ml={6}
                >
                  {completedCount}/{totalCount}
                </Badge>
              )}
            </Button>
          </Tooltip>
        )}

        <div className={classes.mobileSettings}>
          <Tooltip label={t('settings.title')}>
            <ActionIcon
              variant="subtle"
              size="md"
              color="gray"
              aria-label={t('nav.openSettings')}
              onClick={() => void openSettings()}
            >
              <IconSettings size={17} />
            </ActionIcon>
          </Tooltip>
        </div>
      </Group>
    </Group>
  );
}
