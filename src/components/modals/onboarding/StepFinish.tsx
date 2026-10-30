import React from 'react';
import {
  Stack,
  Group,
  ThemeIcon,
  Title,
  Text,
  Card,
  SimpleGrid,
} from '@mantine/core';
import {
  IconCheck,
  IconSettings,
  IconLayoutKanban,
  IconClock,
  IconAdjustments,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export const StepFinish: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Group gap="md" align="center">
        <ThemeIcon size={44} radius="xl" color="teal" variant="light">
          <IconCheck size={26} stroke={2.5} />
        </ThemeIcon>
        <div>
          <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
            {t('onboarding.stepFinishTitle')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('onboarding.stepFinishSubtitle')}
          </Text>
        </div>
      </Group>

      {/* Informative Settings Notice Card */}
      <Card
        withBorder
        radius="md"
        p="md"
        style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
      >
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
            <Group gap={8} wrap="nowrap">
              <ThemeIcon size={20} radius="xl" color="indigo" variant="light">
                <IconLayoutKanban size={12} />
              </ThemeIcon>
              <Text size="xs" fw={500}>
                {t('onboarding.settingsNoticeKanban')}
              </Text>
            </Group>

            <Group gap={8} wrap="nowrap">
              <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                <IconClock size={12} />
              </ThemeIcon>
              <Text size="xs" fw={500}>
                {t('onboarding.settingsNoticeRoutines')}
              </Text>
            </Group>

            <Group gap={8} wrap="nowrap">
              <ThemeIcon size={20} radius="xl" color="grape" variant="light">
                <IconAdjustments size={12} />
              </ThemeIcon>
              <Text size="xs" fw={500}>
                {t('onboarding.settingsNoticeArchiving')}
              </Text>
            </Group>
          </SimpleGrid>

          <Text size="xs" c="dimmed" mt={4} fs="italic">
            {t('onboarding.settingsNoticeRevisit')}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};
