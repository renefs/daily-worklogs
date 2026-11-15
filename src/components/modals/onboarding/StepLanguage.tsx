import React from 'react';
import { Stack, Title, Text, SimpleGrid, Card, Group, ThemeIcon, Select } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './OnboardingStep.module.css';

export interface StepLanguageProps {
  language: 'en' | 'es';
  onLanguageChange: (lang: 'en' | 'es') => void;
}

export const StepLanguage: React.FC<StepLanguageProps> = ({
  language,
  onLanguageChange,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} className={classes.title}>
          {t('onboarding.stepLanguageTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepLanguageDescription')}
        </Text>
      </div>

      <SimpleGrid cols={1} spacing="md">
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
              aria-label={t('onboarding.languageSelect')}
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
      </SimpleGrid>
    </Stack>
  );
};
