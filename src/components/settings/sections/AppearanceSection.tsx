import React from 'react';
import { Stack, Paper, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { ColorSchemeControl } from '../appearance/ColorSchemeControl';
import { ThemeColorPicker } from '../appearance/ThemeColorPicker';
import { SettingsSection } from '../SettingsSection';

export const AppearanceSection: React.FC = () => {
  const { t } = useTranslation();

  const { settings, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  if (!settings) return null;

  return (
    <SettingsSection
      title={t('settings.appearance')}
      description={t('settings.appearanceDescription')}
      scope="vault"
    >
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('settings.colorScheme')}
            </Text>
            {/* The theme provider follows settings.colorScheme, so no direct scheme call is needed here. */}
            <ColorSchemeControl
              value={settings.colorScheme}
              onChange={(mode) => updateSettings({ colorScheme: mode })}
            />
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('settings.themeColor')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.themeDescription')}
            </Text>
            <ThemeColorPicker
              value={settings.themeColor}
              onChange={(color) => updateSettings({ themeColor: color })}
            />
          </Stack>
        </Paper>
      </Stack>
    </SettingsSection>
  );
};
