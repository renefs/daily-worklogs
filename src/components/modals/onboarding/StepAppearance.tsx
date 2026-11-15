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
import classes from './OnboardingStep.module.css';

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
        <Title order={3} fw={700} className={classes.title}>
          {t('onboarding.stepEditorTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepEditorDescription')}
        </Text>
      </div>

      <SimpleGrid cols={1} spacing="sm">
        {/* Auto Save Card */}
        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={600}>
                {t('settings.autoSave')}
              </Text>
              <Switch
                aria-label={t('settings.autoSave')}
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
            <Text size="xs" c="dimmed">
              {t('onboarding.appearancePreviewHint')}
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
