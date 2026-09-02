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
import { useAppStore, useAppStoreSelector } from './store/useAppStore';
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

// Modern Blue 10-shade palette (#3b82f6 base)
const modernBlueColors: MantineColorsTuple = [
  '#ebf5ff',
  '#d1e7ff',
  '#a3ceff',
  '#70b0ff',
  '#4791ff',
  '#3b82f6', // 5: Base primary blue
  '#2563eb', // 6: Primary filled / hover
  '#1d4ed8', // 7: Active / text
  '#1e40af', // 8
  '#172554', // 9
];

// Claude Terracotta palette (#da7756 base)
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
  const { initApp, settings } = useAppStoreSelector((state) => ({
    initApp: state.initApp,
    settings: state.settings,
  }));
  const { i18n } = useTranslation();

  useEffect(() => {
    initApp();

    let focusTimer: number | undefined;

    const handleFocus = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        const { refreshNotesList, refreshTasksList } = useAppStore.getState();
        void Promise.all([refreshNotesList(), refreshTasksList()]);
      }, 250);
    };

    window.addEventListener('focus', handleFocus);
    const unsubscribeNote = window.electronAPI?.onNoteFileChanged?.((change) => {
      useAppStore.getState().handleExternalNoteChange(change);
      void useAppStore.getState().refreshNotesList();
    });
    const unsubscribeVault = window.electronAPI?.onVaultFilesChanged?.(({ relativePath }) => {
      if (relativePath.startsWith('tasks/')) void useAppStore.getState().refreshTasksList();
      if (relativePath.startsWith('.daily-worklogs/')) void useAppStore.getState().loadSettings();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearTimeout(focusTimer);
      unsubscribeNote?.();
      unsubscribeVault?.();
    };
  }, [initApp]);

  const currentLocale = i18n.language === 'es' ? 'es' : 'en';

  const theme = useMemo(() => {
    const primaryColorKey = settings?.themeColor || 'blue';
    const customPalettes: Record<string, MantineColorsTuple> = {
      blue: modernBlueColors,
      claude: claudeColors,
      terracotta: claudeColors,
    };

    const primaryShades = (
      customPalettes[primaryColorKey] ||
      DEFAULT_THEME.colors[primaryColorKey] ||
      modernBlueColors
    ) as MantineColorsTuple;

    return createTheme({
      primaryColor: 'primary',
      colors: {
        primary: primaryShades,
        blue: modernBlueColors,
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
