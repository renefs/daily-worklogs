import React, { useEffect } from 'react';
import {
  AppShell,
  Center,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { DailyView } from '../views/DailyView';
import { WeeklyView } from '../views/WeeklyView';
import { MonthlyView } from '../views/MonthlyView';
import { CalendarView } from '../views/CalendarView';
import { KanbanView } from '../views/KanbanView';
import { SettingsModal } from '../modals/SettingsModal';
import { TaskModal } from '../modals/TaskModal';
import { ManageRoutinesModal } from '../modals/ManageRoutinesModal';
import { OnboardingWizardModal } from '../modals/OnboardingWizardModal';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentView, isLoading, openSettings } = useAppStore();

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

  return (
    <AppShell
      header={{ height: 54 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="md"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>

      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          height: 'calc(100vh - 54px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        {currentView === 'daily' && <DailyView />}
        {currentView === 'weekly' && <WeeklyView />}
        {currentView === 'monthly' && <MonthlyView />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'tasks' && <KanbanView />}
      </AppShell.Main>

      {/* Global Modals */}
      <SettingsModal />
      <TaskModal />
      <ManageRoutinesModal />
      <OnboardingWizardModal />
    </AppShell>
  );
};

