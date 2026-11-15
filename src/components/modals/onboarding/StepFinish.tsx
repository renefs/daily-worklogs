import React from 'react';
import { Stack, Group, ThemeIcon, Title, Text, Card, SimpleGrid } from '@mantine/core';
import {
  IconCheck,
  IconSettings,
  IconLayoutKanban,
  IconClock,
  IconAdjustments,
  IconHierarchy2,
  IconTags,
  IconArchive,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './OnboardingStep.module.css';

const SETTINGS_ITEMS = [
  { key: 'settingsNoticeAreas', color: 'blue', Icon: IconHierarchy2 },
  { key: 'settingsNoticeKanban', color: 'indigo', Icon: IconLayoutKanban },
  { key: 'settingsNoticeClosedTasks', color: 'gray', Icon: IconArchive },
  { key: 'settingsNoticeTags', color: 'orange', Icon: IconTags },
  { key: 'settingsNoticeRoutines', color: 'teal', Icon: IconClock },
  { key: 'settingsNoticeEditor', color: 'grape', Icon: IconAdjustments },
] as const;

export const StepFinish: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Group gap="md" align="center">
        <ThemeIcon size={44} radius="xl" color="teal" variant="light">
          <IconCheck size={26} stroke={2.5} />
        </ThemeIcon>
        <div>
          <Title order={3} fw={700} className={classes.title}>
            {t('onboarding.stepFinishTitle')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('onboarding.stepFinishSubtitle')}
          </Text>
        </div>
      </Group>

      <Card withBorder radius="md" p="md" className={classes.softPanel}>
        <Stack gap="xs">
          <Group gap="xs">
            <ThemeIcon size={24} radius="md" color="primary" variant="filled">
              <IconSettings size={14} />
            </ThemeIcon>
            <Text size="sm" fw={700}>
              {t('onboarding.stepFinishSettingsNoticeTitle')}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t('onboarding.stepFinishSettingsNoticeDesc')}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt={4}>
            {SETTINGS_ITEMS.map(({ key, color, Icon }) => (
              <Group key={key} gap={8} wrap="nowrap">
                <ThemeIcon size={20} radius="xl" color={color} variant="light">
                  <Icon size={12} />
                </ThemeIcon>
                <Text size="xs" fw={500}>
                  {t(`onboarding.${key}`)}
                </Text>
              </Group>
            ))}
          </SimpleGrid>

          <Text size="xs" c="dimmed" mt={4} fs="italic">
            {t('onboarding.settingsNoticeRevisit')}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};
