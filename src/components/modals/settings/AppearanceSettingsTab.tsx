import React from 'react';
import {
  Stack,
  Paper,
  Text,
  SegmentedControl,
  Group,
  ColorSwatch,
  CheckIcon,
  Slider,
  useMantineColorScheme,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';

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

export const AppearanceSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();

  const { settings, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  if (!settings) return null;

  const handleColorSchemeChange = (mode: 'light' | 'dark' | 'auto') => {
    updateSettings({ colorScheme: mode });
    setColorScheme(mode);
  };

  const handleThemeColorChange = (color: string) => {
    updateSettings({ themeColor: color });
  };

  return (
    <Stack gap="lg">
      {/* Color Mode */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {t('settings.colorScheme')}
          </Text>
          <SegmentedControl
            value={settings.colorScheme}
            onChange={(val) => handleColorSchemeChange(val as 'light' | 'dark' | 'auto')}
            data={[
              { value: 'light', label: t('settings.light') },
              { value: 'dark', label: t('settings.dark') },
              { value: 'auto', label: t('settings.auto') },
            ]}
            size="sm"
          />
        </Stack>
      </Paper>

      {/* Theme Accent Color */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {t('settings.themeColor')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('settings.themeDescription')}
          </Text>
          <Group gap="sm" mt="xs">
            {THEME_COLORS.map((color) => {
              const isSelected = (settings.themeColor || 'claude') === color;
              return (
                <ColorSwatch
                  key={color}
                  color={`var(--mantine-color-${color}-6)`}
                  size={32}
                  radius="md"
                  style={{ color: '#fff', cursor: 'pointer' }}
                  onClick={() => handleThemeColorChange(color)}
                >
                  {isSelected && <CheckIcon width={14} />}
                </ColorSwatch>
              );
            })}
          </Group>
        </Stack>
      </Paper>

      {/* Font Size */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              {t('settings.fontSize')}
            </Text>
            <Text size="sm" c="dimmed">
              {settings.editorFontSize}px
            </Text>
          </Group>
          <Slider
            value={settings.editorFontSize}
            onChange={(val) => updateSettings({ editorFontSize: val })}
            min={12}
            max={24}
            step={1}
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
  );
};
