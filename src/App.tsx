import React, { useEffect, useMemo } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/layout/AppLayout';

export const App: React.FC = () => {
  const { initApp, settings } = useAppStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const theme = useMemo(() => {
    return createTheme({
      primaryColor: settings?.themeColor || 'indigo',
      fontFamily: 'var(--font-sans)',
      headings: {
        fontFamily: 'var(--font-display)',
      },
      defaultRadius: 'md',
    });
  }, [settings?.themeColor]);

  return (
    <MantineProvider theme={theme} defaultColorScheme={settings?.colorScheme === 'dark' ? 'dark' : 'light'}>
      <Notifications position="top-right" zIndex={2000} />
      <AppLayout />
    </MantineProvider>
  );
};
