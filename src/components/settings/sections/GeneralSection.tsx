import React from 'react';
import { Stack, Paper, Text, Group, Button, Select } from '@mantine/core';
import { IconFolder, IconFolderOpen, IconSparkles, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { WeekStartDay } from '../../../types';
import { SettingsSection } from '../SettingsSection';
import classes from './GeneralSection.module.css';

export const GeneralSection: React.FC = () => {
  const { t } = useTranslation();

  const { settings, updateSettings, openOnboarding, changeVault } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
    openOnboarding: state.openOnboarding,
    changeVault: state.changeVault,
  }));

  if (!settings) return null;

  const handleChangeVault = async () => {
    if (!window.electronAPI) {
      notifications.show({
        title: t('settings.vaultLocation'),
        message: t('settings.desktopOnlyVault'),
        color: 'blue',
      });
      return;
    }
    const selected = await changeVault();
    if (selected) {
      notifications.show({
        title: t('settings.vaultLocation'),
        message: selected,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleOpenInFinder = async () => {
    if (window.electronAPI && settings) {
      await window.electronAPI.openInFileManager(settings.vaultPath);
    } else {
      notifications.show({
        title: t('settings.openInFinder'),
        message: t('settings.desktopOnlyFileManager'),
        color: 'blue',
      });
    }
  };

  const handleLanguageChange = (lang: string | null) => {
    if (lang === 'en' || lang === 'es') {
      updateSettings({ language: lang });
    }
  };

  const handleWeekStartChange = (val: string | null) => {
    if (val !== null) {
      updateSettings({ weekStartDay: parseInt(val, 10) as WeekStartDay });
    }
  };

  return (
    <SettingsSection
      title={t('settings.general')}
      description={t('settings.generalDescription')}
      hint={t('settings.scopeGeneral')}
    >
      <Stack gap="lg">
        {/* Vault Folder */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('settings.vaultLocation')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.vaultDescription')}
            </Text>
            <Text size="xs" p="xs" className={classes.vaultPath}>
              {settings.vaultPath}
            </Text>
            <Group gap="xs" mt="xs">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconFolder size={14} />}
                onClick={handleChangeVault}
              >
                {t('settings.changeVault')}
              </Button>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconFolderOpen size={14} />}
                onClick={handleOpenInFinder}
              >
                {t('settings.openInFinder')}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Language */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('settings.language')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.languageDescription')}
            </Text>
            <Select
              aria-label={t('settings.language')}
              value={settings.language}
              onChange={handleLanguageChange}
              data={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
              ]}
              allowDeselect={false}
              size="sm"
            />
          </Stack>
        </Paper>

        {/* Week Start Day */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('settings.weekStart')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.weekStartDescription')}
            </Text>
            <Select
              aria-label={t('settings.weekStart')}
              value={String(settings.weekStartDay)}
              onChange={handleWeekStartChange}
              data={[
                { value: '1', label: t('settings.monday') },
                { value: '2', label: t('settings.tuesday') },
                { value: '3', label: t('settings.wednesday') },
                { value: '4', label: t('settings.thursday') },
                { value: '5', label: t('settings.friday') },
                { value: '6', label: t('settings.saturday') },
                { value: '0', label: t('settings.sunday') },
              ]}
              allowDeselect={false}
              size="sm"
            />
          </Stack>
        </Paper>

        {/* Re-run Setup Wizard */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <div className={classes.wizardText}>
              <Text fw={600} size="sm">
                {t('settings.rerunWizard')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('settings.rerunWizardDesc')}
              </Text>
            </div>
            <Button
              variant="light"
              color="primary"
              size="xs"
              leftSection={<IconSparkles size={14} />}
              onClick={openOnboarding}
            >
              {t('settings.rerunWizard')}
            </Button>
          </Group>
        </Paper>
      </Stack>
    </SettingsSection>
  );
};
