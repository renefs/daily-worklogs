import React, { useEffect } from 'react';
import {
  AppShell,
  Center,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStore, useAppStoreSelector } from '../../store/useAppStore';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { NavigationRail } from './NavigationRail';
import { isReportView } from '../../utils/reportPeriod';
import { flushTaskEditor } from '../../services/editorSession';
import classes from './AppLayout.module.css';
import clsx from 'clsx';

const DailyView = React.lazy(() => import('../views/DailyView').then((module) => ({ default: module.DailyView })));
const ReportsView = React.lazy(() => import('../views/ReportsView').then((module) => ({ default: module.ReportsView })));
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
    activeNote,
    isDirty,
    settings,
    saveActiveNote,
  } = useAppStoreSelector((state) => ({
    currentView: state.currentView,
    isLoading: state.isLoading,
    openSettings: state.openSettings,
    isSidebarCollapsed: state.isSidebarCollapsed,
    isSettingsOpen: state.isSettingsOpen,
    isTaskModalOpen: state.isTaskModalOpen,
    isManageRoutinesModalOpen: state.isManageRoutinesModalOpen,
    isOnboardingOpen: state.isOnboardingOpen,
    activeNote: state.activeNote,
    isDirty: state.isDirty,
    settings: state.settings,
    saveActiveNote: state.saveActiveNote,
  }));

  // Keep note persistence alive even when Preview or another application view
  // unmounts the CodeMirror component.
  useEffect(() => {
    if (!settings?.autoSave || !isDirty || !activeNote) return;
    const timer = window.setTimeout(() => {
      void saveActiveNote();
    }, settings.autoSaveDelay || 1000);
    return () => window.clearTimeout(timer);
  }, [activeNote?.content, activeNote?.date, isDirty, saveActiveNote, settings?.autoSave, settings?.autoSaveDelay]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onRequestEditorFlushBeforeClose?.(() => {
      void (async () => {
        const state = useAppStore.getState();
        const taskSaved = state.currentView !== 'task' || await flushTaskEditor();
        const noteSaved = !state.isDirty || await state.saveActiveNote({ force: true });
        window.electronAPI.completeEditorFlushBeforeClose?.(taskSaved && noteSaved);
      })();
    });
    return unsubscribe;
  }, []);

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
        void state.saveActiveNote({ force: true });
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

  const sidebarWidth = isSidebarCollapsed ? 56 : 316;

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{ width: sidebarWidth, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding="md"
      className={classes.shell}
    >
      <AppShell.Header className={clsx(classes.header, 'app-header')}>
        <AppHeader />
      </AppShell.Header>

      <AppShell.Navbar className={clsx(classes.sidebarNavbar, 'app-sidebar-navbar')}>
        <div className={classes.sidebarLayout}>
          <NavigationRail />
          {!isSidebarCollapsed && <AppSidebar />}
        </div>
      </AppShell.Navbar>

      <AppShell.Main className={clsx(classes.mainContent, 'app-main-content')}>
        <React.Suspense fallback={<Center h="100%"><Loader size="md" /></Center>}>
          {currentView === 'daily' && <DailyView />}
          {isReportView(currentView) && <ReportsView />}
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
