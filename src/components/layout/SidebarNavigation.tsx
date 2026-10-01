import { Tooltip, UnstyledButton } from '@mantine/core';
import { IconCalendarEvent, IconChartBar, IconLayoutKanban } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { isReportView } from '../../utils/reportPeriod';
import classes from './SidebarNavigation.module.css';

interface SidebarNavigationProps { collapsed?: boolean; horizontal?: boolean; }

export function SidebarNavigation({ collapsed = false, horizontal = false }: SidebarNavigationProps) {
  const { t } = useTranslation();
  const { currentView, setCurrentView, openReports } = useAppStoreSelector((s) => ({ currentView: s.currentView, setCurrentView: s.setCurrentView, openReports: s.openReports }));
  const entries = [
    { key: 'daily', label: t('nav.daily'), Icon: IconCalendarEvent, active: currentView === 'daily', action: () => { void setCurrentView('daily'); } },
    { key: 'reports', label: t('nav.reports'), Icon: IconChartBar, active: isReportView(currentView), action: () => { void openReports(); } },
    { key: 'tasks', label: t('nav.tasks'), Icon: IconLayoutKanban, active: currentView === 'tasks' || currentView === 'task', action: () => { void setCurrentView('tasks'); } },
  ];
  return <nav className={horizontal ? classes.horizontal : classes.vertical} aria-label={t('nav.mainNavigation')}>
    {entries.map(({ key, label, Icon, active, action }) => <Tooltip key={key} label={label} disabled={!collapsed} position="right">
      <UnstyledButton className={classes.link} data-section={key} data-collapsed={collapsed || undefined} aria-label={label}
        data-active={active || undefined} aria-current={active ? 'page' : undefined} onClick={action}>
        <Icon size={18} /><span hidden={collapsed}>{label}</span>
      </UnstyledButton>
    </Tooltip>)}
  </nav>;
}
