import React, { useEffect, useMemo } from 'react';
import { MantineProvider, createTheme, DEFAULT_THEME, MantineColorsTuple } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/layout/AppLayout';

export const App: React.FC = () => {
  const { initApp, settings } = useAppStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const currentLocale = i18n.language === 'es' ? 'es' : 'en';

  const theme = useMemo(() => {
    const primaryColorKey = settings?.themeColor || 'indigo';
    const primaryShades = (DEFAULT_THEME.colors[primaryColorKey] || DEFAULT_THEME.colors.indigo) as MantineColorsTuple;

    return createTheme({
      primaryColor: 'primary',
      colors: {
        primary: primaryShades,
      },
      fontFamily: 'var(--font-sans)',
      headings: {
        fontFamily: 'var(--font-display)',
      },
      defaultRadius: 'md',
    });
  }, [settings?.themeColor]);

  return (
    <MantineProvider theme={theme} defaultColorScheme={settings?.colorScheme === 'dark' ? 'dark' : 'light'}>
      <DatesProvider
        settings={{
          locale: currentLocale,
          firstDayOfWeek: settings?.weekStartDay ?? 1,
        }}
      >
        <Notifications position="top-right" zIndex={2000} />
        <AppLayout />
      </DatesProvider>
    </MantineProvider>
  );
};

