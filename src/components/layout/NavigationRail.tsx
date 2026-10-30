import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { spotlight } from '@mantine/spotlight';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { SidebarNavigation } from './SidebarNavigation';
import classes from './NavigationRail.module.css';

export function NavigationRail() {
  const { t } = useTranslation();
  const { currentView, isSidebarCollapsed, toggleSidebarCollapse, openSettings } = useAppStoreSelector((s) => ({
    currentView: s.currentView,
    isSidebarCollapsed: s.isSidebarCollapsed,
    toggleSidebarCollapse: s.toggleSidebarCollapse,
    openSettings: s.openSettings,
  }));
  const isDailyView = currentView === 'daily';
  const isSettingsView = currentView === 'settings';
  const isToggleDisabled = !isDailyView;
  const isCollapsed = isToggleDisabled || isSidebarCollapsed;
  const toggleLabel = t(isCollapsed ? 'nav.expandSidebar' : 'nav.collapseSidebar');

  return (
    <Stack className={classes.rail} gap="xs">
      <Tooltip label={toggleLabel} position="right">
        <UnstyledButton
          className={classes.railButton}
          aria-label={toggleLabel}
          disabled={isToggleDisabled}
          data-disabled={isToggleDisabled || undefined}
          onClick={isToggleDisabled ? undefined : () => toggleSidebarCollapse(!isSidebarCollapsed)}
        >
          {isCollapsed ? (
            <IconLayoutSidebarLeftExpand size={18} />
          ) : (
            <IconLayoutSidebarLeftCollapse size={18} />
          )}
        </UnstyledButton>
      </Tooltip>

      <div className={classes.divider} role="separator" />

      <SidebarNavigation collapsed />

      <Tooltip label={t('spotlight.searchVault', 'Search vault (⌘K)')} position="right">
        <UnstyledButton
          className={classes.railButton}
          mt="auto"
          aria-label={t('spotlight.searchVault', 'Search vault')}
          onClick={() => spotlight.open()}
        >
          <IconSearch size={18} />
        </UnstyledButton>
      </Tooltip>

      {/* An open tooltip swallows the first Esc, so it is remounted and disabled while Settings is the current page. */}
      <Tooltip
        key={isSettingsView ? 'settings-current' : 'settings'}
        label={t('settings.title')}
        position="right"
        disabled={isSettingsView}
      >
        <UnstyledButton
          className={classes.railButton}
          aria-label={t('nav.openSettings')}
          aria-current={isSettingsView ? 'page' : undefined}
          data-active={isSettingsView || undefined}
          onClick={() => void openSettings()}
        >
          <IconSettings size={18} />
        </UnstyledButton>
      </Tooltip>
    </Stack>
  );
}
