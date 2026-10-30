import React, { useState } from 'react';
import { Group, Paper, Slider, Stack, Switch, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { SettingsSection } from '../SettingsSection';

export const EditorSection: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  // While the thumb is dragged only this draft changes; the settings are written once on release.
  const [draftFontSize, setDraftFontSize] = useState<number | null>(null);

  if (!settings) return null;

  const fontSize = draftFontSize ?? settings.editorFontSize;

  return (
    <SettingsSection
      title={t('settings.editor')}
      description={t('settings.editorDescription')}
      scope="vault"
    >
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={600} size="sm">
                {t('settings.autoSave')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('settings.autoSaveDescription')}
              </Text>
            </div>
            <Switch
              checked={settings.autoSave}
              aria-label={t('settings.autoSave')}
              onChange={(e) => updateSettings({ autoSave: e.currentTarget.checked })}
            />
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {t('settings.fontSize')}
              </Text>
              <Text size="sm" c="dimmed">
                {fontSize}px
              </Text>
            </Group>
            <Slider
              value={fontSize}
              onChange={setDraftFontSize}
              onChangeEnd={(value) => {
                // Keep showing the dragged value until the saved settings arrive to avoid a flicker.
                void updateSettings({ editorFontSize: value }).finally(() => setDraftFontSize(null));
              }}
              min={12}
              max={24}
              step={1}
              label={(value) => `${value}px`}
              thumbProps={{ 'aria-label': t('settings.fontSize') }}
              marks={[
                { value: 12, label: '12' },
                { value: 15, label: '15' },
                { value: 18, label: '18' },
                { value: 24, label: '24' },
              ]}
              mb="sm"
            />
          </Stack>
        </Paper>
      </Stack>
    </SettingsSection>
  );
};
