import { ActionIcon, Stack, Tooltip } from '@mantine/core';
import { IconLayoutSidebar, IconSettings } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { SidebarNavigation } from './SidebarNavigation';
import classes from './NavigationRail.module.css';

export function NavigationRail() {
  const { t } = useTranslation();
  const { isSidebarCollapsed, toggleSidebarCollapse, setIsSettingsOpen } = useAppStoreSelector((s) => ({
    isSidebarCollapsed: s.isSidebarCollapsed,
    toggleSidebarCollapse: s.toggleSidebarCollapse,
    setIsSettingsOpen: s.setIsSettingsOpen,
  }));
  const toggleLabel = t(isSidebarCollapsed ? 'nav.expandSidebar' : 'nav.collapseSidebar');
  return <Stack className={classes.rail} gap="lg">
    <Tooltip label={toggleLabel} position="right">
      <ActionIcon variant="subtle" color="gray" size="lg" aria-label={toggleLabel}
        onClick={() => toggleSidebarCollapse(!isSidebarCollapsed)}><IconLayoutSidebar size={19} /></ActionIcon>
    </Tooltip>
    <SidebarNavigation collapsed />
    <Tooltip label={t('settings.title')} position="right">
      <ActionIcon variant="subtle" color="gray" size="lg" mt="auto" aria-label={t('nav.openSettings')}
        onClick={() => setIsSettingsOpen(true)}><IconSettings size={19} /></ActionIcon>
    </Tooltip>
  </Stack>;
}
