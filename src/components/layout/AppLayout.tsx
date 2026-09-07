import React, { useEffect } from 'react';
import {
  AppShell,
  Center,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { useAppStore, useAppStoreSelector } from '../../store/useAppStore';
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

  useEffect(() => {
    let lastSaveTime = 0;
    const handleAppSave = () => {
      const now = Date.now();
      if (now - lastSaveTime < 300) return;
      lastSaveTime = now;

      const state = useAppStore.getState();
      // If we are currently in task view, TaskView handles its own save
      if (state.currentView === 'task') return;

      if (state.activeNote) {
        void state.saveActiveNote({ showNotification: true, force: true });
      } else {
        notifications.show({
          id: 'changes-saved',
          title: t('editor.saved', 'All changes saved'),
          message: t('editor.fileSaved', 'File saved successfully'),
          color: 'teal',
          icon: <IconCheck size={16} />,
          autoClose: 2000,
        });
      }
    };

    window.addEventListener('app:save', handleAppSave);

    const unsubTriggerSave = window.electronAPI?.onTriggerSave?.(() => {
      window.dispatchEvent(new CustomEvent('app:save'));
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:save'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('app:save', handleAppSave);
      window.removeEventListener('keydown', handleKeyDown);
      unsubTriggerSave?.();
    };
  }, [t]);

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
