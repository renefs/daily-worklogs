import React from 'react';
import { Stack, Title, Text, SimpleGrid, Card, Group, ThemeIcon, Select, Paper } from '@mantine/core';
import { IconLanguage, IconCalendarWeek } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DATE_FORMAT_PRESETS } from '../../../utils/dateTemplate';

export interface StepLanguageProps {
  language: 'en' | 'es';
  dateFormat: string;
  onLanguageChange: (lang: 'en' | 'es') => void;
  onDateFormatChange: (format: string) => void;
  previewFormattedDate: string;
}

export const StepLanguage: React.FC<StepLanguageProps> = ({
  language,
  dateFormat,
  onLanguageChange,
  onDateFormatChange,
  previewFormattedDate,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {t('onboarding.stepLanguageTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepLanguageDescription')}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {t('onboarding.languageSelect')}
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="blue">
                <IconLanguage size={14} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed">
              {t('onboarding.languageHelp')}
            </Text>
            <Select
              value={language}
              onChange={(val) => onLanguageChange((val as 'en' | 'es') || 'en')}
              data={[
                { value: 'en', label: 'English 🇺🇸' },
                { value: 'es', label: 'Español 🇪🇸' },
              ]}
              allowDeselect={false}
              mt="xs"
            />
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {t('onboarding.dateFormatSelect')}
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="indigo">
                <IconCalendarWeek size={14} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed">
              {t('onboarding.dateFormatHelp')}
            </Text>
            <Select
              value={dateFormat}
              onChange={(val) => onDateFormatChange(val || 'YYYY-MM-DD')}
              data={DATE_FORMAT_PRESETS.filter((p) => p.value !== 'custom').map((p) => ({
                value: p.value,
                label: `${t(p.labelKey)} (${p.value})`,
              }))}
              allowDeselect={false}
              mt="xs"
            />
            <Paper
              p="xs"
              radius="sm"
              withBorder
              style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
            >
              <Text size="xs" c="dimmed">
                {t('onboarding.dateFormatPreview')}:{' '}
                <strong style={{ color: 'var(--mantine-color-primary-text)' }}>
                  {previewFormattedDate}
                </strong>
              </Text>
            </Paper>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
};
