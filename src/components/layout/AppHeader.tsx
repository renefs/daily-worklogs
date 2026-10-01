import { Group, ActionIcon, Tooltip, Text } from '@mantine/core';
import { IconSettings, IconBook2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAppStoreSelector } from '../../store/useAppStore';
import { SidebarNavigation } from './SidebarNavigation';
import classes from './AppHeader.module.css';

export function AppHeader() {
  const { t } = useTranslation();
  const setIsSettingsOpen = useAppStoreSelector((s) => s.setIsSettingsOpen);
  const isMac = typeof window !== 'undefined' && (window.electronAPI?.platform === 'darwin' || /Macintosh|Mac OS X/i.test(navigator.userAgent));
  return <Group h="100%" align="center" justify="space-between" wrap="nowrap"
    data-mac={isMac || undefined} className={clsx('app-drag-region', classes.headerGroup)}>
    <Group gap={8} wrap="nowrap" className="app-no-drag">
      <div className={classes.brandingIcon}><IconBook2 size={15} /></div>
      <Text fw={600} size="sm" className={classes.brandingTitle}>{t('nav.brand')}</Text>
    </Group>
    <div className={clsx('app-no-drag', classes.mobileNavigation)}><SidebarNavigation horizontal /></div>
    <div className={classes.mobileSettings}><Tooltip label={t('settings.title')}><ActionIcon variant="subtle" size="md" color="gray"
      className="app-no-drag" aria-label={t('nav.openSettings')} onClick={() => setIsSettingsOpen(true)}>
      <IconSettings size={17} />
    </ActionIcon></Tooltip></div>
  </Group>;
}
