import React from 'react';
import { Stack, Title, Text, Card, Group, TextInput, Button, Paper, ThemeIcon, Code } from '@mantine/core';
import { IconFolder, IconFolderOpen, IconSparkles, IconCloud } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './OnboardingStep.module.css';

export interface StepVaultProps {
  vaultPath: string;
  onSelectDirectory: () => void;
  onOpenDirectory: () => void;
}

const VAULT_FOLDERS = [
  { path: 'YYYY/YYYY-MM-DD.md', key: 'vaultFolderNotes' },
  { path: 'tasks/', key: 'vaultFolderTasks' },
  { path: 'images/', key: 'vaultFolderImages' },
  { path: '.daily-worklogs/config.json', key: 'vaultFolderConfig' },
] as const;

export const StepVault: React.FC<StepVaultProps> = ({
  vaultPath,
  onSelectDirectory,
  onOpenDirectory,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} className={classes.title}>
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
          <TextInput
            value={vaultPath}
            readOnly
            aria-label={t('onboarding.currentVault')}
            classNames={{ input: classes.vaultInputField }}
            leftSection={<IconFolder size={16} />}
          />
          <Group gap="xs">
            <Button
              variant="light"
              color="primary"
              size="xs"
              leftSection={<IconFolderOpen size={16} />}
              onClick={onSelectDirectory}
            >
              {t('onboarding.changeVault')}
            </Button>
            <Button variant="subtle" color="gray" size="xs" onClick={onOpenDirectory} disabled={!vaultPath}>
              {t('onboarding.openVault')}
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            {t('onboarding.vaultLayoutIntro')}
          </Text>
          <ul className={classes.folderList}>
            {VAULT_FOLDERS.map(({ path, key }) => (
              <li key={key}>
                <Text size="xs">
                  <Code>{path}</Code> {t(`onboarding.${key}`)}
                </Text>
              </li>
            ))}
          </ul>
        </Stack>
      </Card>

      <Paper p="sm" radius="md" withBorder className={classes.softPanel}>
        <Stack gap="xs">
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
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <ThemeIcon size={24} radius="xl" color="teal" variant="light" mt={2}>
              <IconCloud size={14} />
            </ThemeIcon>
            <div>
              <Text size="xs" fw={700}>
                {t('onboarding.stepVaultSyncTitle')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('onboarding.stepVaultSyncDesc')}
              </Text>
            </div>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
};
