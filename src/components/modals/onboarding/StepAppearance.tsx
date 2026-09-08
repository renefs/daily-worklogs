import React from 'react';
import {
  Stack,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Switch,
  Select,
  Badge,
  ColorSwatch,
  CheckIcon,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';

const THEME_COLORS = [
  'claude',
  'indigo',
  'teal',
  'blue',
  'violet',
  'cyan',
  'green',
  'orange',
  'grape',
  'pink',
];

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
                {t('onboarding.autoSaveTitle')}
              </Text>
              <Switch
                checked={autoSave}
                onChange={(e) => onAutoSaveChange(e.currentTarget.checked)}
                size="md"
                color="primary"
              />
            </Group>
            <Text size="xs" c="dimmed">
              {t('onboarding.autoSaveDescription')}
            </Text>
          </Stack>
        </Card>

        {/* Appearance Mode */}
        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t('onboarding.colorSchemeTitle')}
            </Text>
            <Select
              value={themeMode}
              onChange={(val) =>
                onThemeModeChange((val as 'light' | 'dark' | 'auto') || 'auto')
              }
              data={[
                { value: 'auto', label: t('settings.auto') },
                { value: 'light', label: t('settings.light') },
                { value: 'dark', label: t('settings.dark') },
              ]}
              allowDeselect={false}
            />
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Theme Accent Color */}
      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {t('onboarding.themeColorTitle')}
            </Text>
            <Badge size="sm" variant="light" color={themeColor}>
              {themeColor}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t('onboarding.themeColorDesc')}
          </Text>
          <Group gap={10} mt={4}>
            {THEME_COLORS.map((col) => (
              <ColorSwatch
                key={col}
                color={`var(--mantine-color-${col}-6)`}
                size={28}
                style={{ cursor: 'pointer' }}
                onClick={() => onThemeColorChange(col)}
              >
                {themeColor === col && <CheckIcon size={12} color="#fff" />}
              </ColorSwatch>
            ))}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};
