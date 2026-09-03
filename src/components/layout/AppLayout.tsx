import React, { useEffect } from 'react';
import {
  AppShell,
  Center,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

const DailyView = React.lazy(() => import('../views/DailyView').then((module) => ({ default: module.DailyView })));
const WeeklyView = React.lazy(() => import('../views/WeeklyView').then((module) => ({ default: module.WeeklyView })));
const MonthlyView = React.lazy(() => import('../views/MonthlyView').then((module) => ({ default: module.MonthlyView })));
const YearlyView = React.lazy(() => import('../views/YearlyView').then((module) => ({ default: module.YearlyView })));
const KanbanView = React.lazy(() => import('../views/KanbanView').then((module) => ({ default: module.KanbanView })));
const TaskView = React.lazy(() => import('../views/TaskView').then((module) => ({ default: module.TaskView })));

const SettingsModal = React.lazy(() =>
  import('../modals/SettingsModal').then((module) => ({ default: module.SettingsModal }))
);
const TaskModal = React.lazy(() =>
  import('../modals/TaskModal').then((module) => ({ default: module.TaskModal }))
);
const ManageRoutinesModal = React.lazy(() =>
  import('../modals/ManageRoutinesModal').then((module) => ({ default: module.ManageRoutinesModal }))
);
const OnboardingWizardModal = React.lazy(() =>
  import('../modals/OnboardingWizardModal').then((module) => ({ default: module.OnboardingWizardModal }))
);

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentView,
    isLoading,
    openSettings,
    isSidebarCollapsed,
    isSettingsOpen,
    isTaskModalOpen,
    isManageRoutinesModalOpen,
    isOnboardingOpen,
  } = useAppStoreSelector((state) => ({
    currentView: state.currentView,
    isLoading: state.isLoading,
    openSettings: state.openSettings,
    isSidebarCollapsed: state.isSidebarCollapsed,
    isSettingsOpen: state.isSettingsOpen,
    isTaskModalOpen: state.isTaskModalOpen,
    isManageRoutinesModalOpen: state.isManageRoutinesModalOpen,
    isOnboardingOpen: state.isOnboardingOpen,
  }));

  useEffect(() => {
    if (window.electronAPI?.onOpenSettings) {
      const unsub = window.electronAPI.onOpenSettings((tab) => {
        openSettings(tab || 'general');
      });
      return unsub;
    }
  }, [openSettings]);

  if (isLoading) {
    return (
      <Center style={{ width: '100vw', height: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="primary" />
          <Text size="sm" c="dimmed">
            {t('common.loading')}
          </Text>
        </Stack>
      </Center>
    );
  }

  const sidebarWidth = isSidebarCollapsed ? 58 : 280;

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{ width: sidebarWidth, breakpoint: 'sm' }}
      padding="md"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <AppShell.Header className="app-header">
        <AppHeader />
      </AppShell.Header>

      <AppShell.Navbar className="app-sidebar-navbar">
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Main
        className="app-main-content"
        style={{
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--app-main-bg)',
        }}
      >
        <React.Suspense fallback={<Center h="100%"><Loader size="md" /></Center>}>
          {currentView === 'daily' && <DailyView />}
          {currentView === 'weekly' && <WeeklyView />}
          {currentView === 'monthly' && <MonthlyView />}
          {currentView === 'yearly' && <YearlyView />}
          {currentView === 'tasks' && <KanbanView />}
          {currentView === 'task' && <TaskView />}
        </React.Suspense>
      </AppShell.Main>

      <React.Suspense fallback={null}>
        {isSettingsOpen && <SettingsModal />}
        {isTaskModalOpen && <TaskModal />}
        {isManageRoutinesModalOpen && <ManageRoutinesModal />}
        {isOnboardingOpen && <OnboardingWizardModal />}
      </React.Suspense>
    </AppShell>
  );
};
