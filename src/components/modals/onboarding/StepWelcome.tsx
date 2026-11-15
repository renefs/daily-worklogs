import React from 'react';
import { Stack, Title, Text, SimpleGrid, Paper, ThemeIcon } from '@mantine/core';
import { IconMarkdown, IconFileText, IconLayoutKanban, IconChartBar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './OnboardingStep.module.css';

const FEATURES = [
  { key: 'Feature1', color: 'blue', Icon: IconMarkdown },
  { key: 'Feature2', color: 'indigo', Icon: IconFileText },
  { key: 'Feature4', color: 'grape', Icon: IconLayoutKanban },
  { key: 'Feature3', color: 'teal', Icon: IconChartBar },
] as const;

export const StepWelcome: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} className={classes.title}>
          {t('onboarding.stepWelcomeTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepWelcomeDescription')}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="xs">
        {FEATURES.map(({ key, color, Icon }) => (
          <Paper key={key} p="md" radius="md" withBorder className={classes.softPanel}>
            <ThemeIcon size={32} radius="md" color={color} variant="light" mb="xs">
              <Icon size={18} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t(`onboarding.stepWelcome${key}Title`)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {t(`onboarding.stepWelcome${key}Desc`)}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
};
