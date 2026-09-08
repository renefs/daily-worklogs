import React from 'react';
import { Stack, Title, Text, SimpleGrid, Paper, ThemeIcon } from '@mantine/core';
import { IconMarkdown, IconFileText, IconChartBar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export const StepWelcome: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {t('onboarding.stepWelcomeTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepWelcomeDescription')}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="xs">
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
        >
          <ThemeIcon size={32} radius="md" color="blue" variant="light" mb="xs">
            <IconMarkdown size={18} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('onboarding.stepWelcomeFeature1Title')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('onboarding.stepWelcomeFeature1Desc')}
          </Text>
        </Paper>

        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
        >
          <ThemeIcon size={32} radius="md" color="indigo" variant="light" mb="xs">
            <IconFileText size={18} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('onboarding.stepWelcomeFeature2Title')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('onboarding.stepWelcomeFeature2Desc')}
          </Text>
        </Paper>

        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
        >
          <ThemeIcon size={32} radius="md" color="teal" variant="light" mb="xs">
            <IconChartBar size={18} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('onboarding.stepWelcomeFeature3Title')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('onboarding.stepWelcomeFeature3Desc')}
          </Text>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};
