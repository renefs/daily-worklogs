import React from 'react';
import {
  Stack,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Switch,
  Badge,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ColorSchemeControl } from '../../settings/appearance/ColorSchemeControl';
import { ThemeColorPicker } from '../../settings/appearance/ThemeColorPicker';

export interface StepAppearanceProps {
  autoSave: boolean;
  onAutoSaveChange: (val: boolean) => void;
  themeMode: 'light' | 'dark' | 'auto';
  onThemeModeChange: (val: 'light' | 'dark' | 'auto') => void;
  themeColor: string;
  onThemeColorChange: (val: string) => void;
}

export const StepAppearance: React.FC<StepAppearanceProps> = ({
  autoSave,
  onAutoSaveChange,
  themeMode,
  onThemeModeChange,
  themeColor,
  onThemeColorChange,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {t('onboarding.stepEditorTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepEditorDescription')}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Auto Save Card */}
        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={600}>
                {t('settings.autoSave')}
              </Text>
              <Switch
                checked={autoSave}
                onChange={(e) => onAutoSaveChange(e.currentTarget.checked)}
                size="md"
                color="primary"
              />
            </Group>
            <Text size="xs" c="dimmed">
              {t('settings.autoSaveDescription')}
            </Text>
          </Stack>
        </Card>

        {/* Appearance Mode */}
        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('settings.colorScheme')}
            </Text>
            <ColorSchemeControl value={themeMode} onChange={onThemeModeChange} />
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Theme Accent Color */}
      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {t('settings.themeColor')}
            </Text>
            <Badge size="sm" variant="light" color={themeColor}>
              {t(`settings.themeColorNames.${themeColor}`, { defaultValue: themeColor })}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t('settings.themeDescription')}
          </Text>
          <ThemeColorPicker value={themeColor} onChange={onThemeColorChange} size={28} />
        </Stack>
      </Card>
    </Stack>
  );
};
