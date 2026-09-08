import React from 'react';
import {
  Stack,
  Paper,
  Text,
  Select,
  TextInput,
  Group,
  Badge,
} from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { DATE_FORMAT_PRESETS, formatTemplateDate } from '../../../utils/dateTemplate';

export const TemplatesSettingsTab: React.FC = () => {
  const { t, i18n } = useTranslation();

  const { settings, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  if (!settings) return null;

  const handleTemplateChange = (templateId: string | null) => {
    if (templateId) {
      updateSettings({ defaultTemplateId: templateId });
    }
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {t('settings.defaultTemplate')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('settings.defaultTemplateDescription')}
          </Text>
          <Select
            value={settings.defaultTemplateId}
            onChange={handleTemplateChange}
            data={settings.templates.map((tpl) => ({
              value: tpl.id,
              label: tpl.name,
            }))}
            allowDeselect={false}
            size="sm"
          />
        </Stack>
      </Paper>

      {/* Template Date Format Setting */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <div>
            <Text fw={600} size="sm">
              {t('settings.templateDateFormat')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.templateDateFormatDesc')}
            </Text>
          </div>

          <Select
            label={t('settings.dateFormatPreset')}
            value={
              DATE_FORMAT_PRESETS.some(
                (p) => p.value !== 'custom' && p.value === (settings.dateFormat || 'YYYY-MM-DD')
              )
                ? settings.dateFormat || 'YYYY-MM-DD'
                : 'custom'
            }
            onChange={(val) => {
              if (!val) return;
              if (val !== 'custom') {
                updateSettings({ dateFormat: val });
              }
            }}
            data={DATE_FORMAT_PRESETS.map((preset) => ({
              value: preset.value,
              label: `${t(preset.labelKey)}${preset.example ? ` (${preset.example})` : ''}`,
            }))}
            allowDeselect={false}
            size="sm"
          />

          {/* Custom Format Input when custom is selected */}
          {(!DATE_FORMAT_PRESETS.some(
            (p) => p.value !== 'custom' && p.value === (settings.dateFormat || 'YYYY-MM-DD')
          ) ||
            settings.dateFormat === 'custom') && (
            <TextInput
              label={t('settings.customDateFormat')}
              placeholder={t('settings.customFormatPlaceholder')}
              value={settings.dateFormat === 'custom' ? '' : settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.currentTarget.value })}
              size="sm"
              radius="md"
            />
          )}

          {/* Live Rendered Preview Card */}
          <Paper
            p="xs"
            radius="md"
            style={{
              backgroundColor: 'var(--mantine-color-default-hover)',
              border: '1px dashed var(--mantine-color-default-border)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap={6}>
                <IconCalendar size={15} color="var(--mantine-primary-color-filled)" />
                <Text size="xs" fw={600}>
                  {t('settings.formatPreview')}:
                </Text>
              </Group>
              <Badge size="md" variant="filled" color="primary" radius="sm">
                {formatTemplateDate(
                  dayjs().format('YYYY-MM-DD'),
                  settings.dateFormat || 'YYYY-MM-DD',
                  i18n.language
                )}
              </Badge>
            </Group>
          </Paper>

          <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
            {t('settings.formatTokensHelp')}
          </Text>
        </Stack>
      </Paper>

      {/* Template previews */}
      {settings.templates.map((tpl) => (
        <Paper key={tpl.id} withBorder p="sm" radius="md">
          <Group justify="space-between" mb={4}>
            <Text fw={600} size="sm">
              {tpl.name}
            </Text>
            {tpl.id === settings.defaultTemplateId && (
              <Text size="xs" c="primary" fw={700}>
                ✓ Default
              </Text>
            )}
          </Group>
          {tpl.description && (
            <Text size="xs" c="dimmed" mb={8}>
              {tpl.description}
            </Text>
          )}
          <pre
            style={{
              backgroundColor: 'var(--mantine-color-default-hover)',
              padding: 8,
              borderRadius: 6,
              fontSize: 12,
              maxHeight: 120,
              overflowY: 'auto',
              margin: 0,
            }}
          >
            {tpl.content}
          </pre>
        </Paper>
      ))}
    </Stack>
  );
};
