import React, { useEffect, useMemo } from 'react';
import {
  MantineProvider,
  createTheme,
  DEFAULT_THEME,
  MantineColorsTuple,
  useMantineColorScheme,
  MantineColorScheme,
} from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/layout/AppLayout';

const ColorSchemeSync: React.FC<{ colorScheme?: 'light' | 'dark' | 'auto' }> = ({ colorScheme }) => {
  const { colorScheme: activeScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const targetScheme = colorScheme || 'auto';
    if (activeScheme !== targetScheme) {
      setColorScheme(targetScheme);
    }
  }, [colorScheme, activeScheme, setColorScheme]);

  return null;
};

// Claude Terracotta / Clay 10-shade palette (#da7756 base)
const claudeColors: MantineColorsTuple = [
  '#fdf6f3',
  '#f8eae2',
  '#f0d2c4',
  '#e6b5a1',
  '#de957b',
  '#da7756', // 5: Claude terracotta base
  '#cc6b49', // 6: primary filled / hover
  '#b45938', // 7: active / text
  '#96482c', // 8
  '#7a3821', // 9
];

export const App: React.FC = () => {
  const { initApp, settings } = useAppStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    initApp();

    const handleFocus = () => {
      const { refreshNotesList, refreshTasksList } = useAppStore.getState();
      refreshNotesList();
      refreshTasksList();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [initApp]);

  const currentLocale = i18n.language === 'es' ? 'es' : 'en';

  const theme = useMemo(() => {
    const primaryColorKey = settings?.themeColor || 'claude';
    const customPalettes: Record<string, MantineColorsTuple> = {
      claude: claudeColors,
      terracotta: claudeColors,
    };

    const primaryShades = (
      customPalettes[primaryColorKey] ||
      DEFAULT_THEME.colors[primaryColorKey] ||
      claudeColors
    ) as MantineColorsTuple;

    return createTheme({
      primaryColor: 'primary',
      colors: {
        primary: primaryShades,
        claude: claudeColors,
        terracotta: claudeColors,
      },
      fontFamily: 'var(--font-sans)',
      headings: {
        fontFamily: 'var(--font-display)',
      },
      defaultRadius: 'md',
    });
  }, [settings?.themeColor]);

  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme={(settings?.colorScheme as MantineColorScheme) || 'auto'}
    >
      <ColorSchemeSync colorScheme={settings?.colorScheme} />
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

