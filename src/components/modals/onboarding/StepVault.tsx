import React from 'react';
import { Stack, Title, Text, Card, Group, TextInput, Button, Paper, ThemeIcon } from '@mantine/core';
import { IconFolder, IconFolderOpen, IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface StepVaultProps {
  vaultPath: string;
  onSelectDirectory: () => void;
  onOpenDirectory: () => void;
}

export const StepVault: React.FC<StepVaultProps> = ({
  vaultPath,
  onSelectDirectory,
  onOpenDirectory,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {t('onboarding.stepVaultTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepVaultDescription')}
        </Text>
      </div>

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            {t('onboarding.currentVault')}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              value={vaultPath}
              readOnly
              style={{ flex: 1 }}
              leftSection={<IconFolder size={16} />}
              styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
            />
            <Button
              variant="light"
              color="primary"
              leftSection={<IconFolderOpen size={16} />}
              onClick={onSelectDirectory}
            >
              {t('onboarding.changeVault')}
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={onOpenDirectory}
            >
              {t('onboarding.openVault')}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Paper
        p="sm"
        radius="md"
        withBorder
        style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
      >
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <ThemeIcon size={24} radius="xl" color="primary" variant="light" mt={2}>
            <IconSparkles size={14} />
          </ThemeIcon>
          <div>
            <Text size="xs" fw={700}>
              {t('onboarding.stepVaultWhyTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('onboarding.stepVaultWhyDesc')}
            </Text>
          </div>
        </Group>
      </Paper>
    </Stack>
  );
};
