import React from 'react';
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
import { SettingsModal } from '../modals/SettingsModal';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentView, isLoading } = useAppStore();

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
      </AppShell.Main>

      {/* Global Modals */}
      <SettingsModal />
    </AppShell>
  );
};
