import React from 'react';
import { Stack, Paper, Text, Group, Button, Select, Switch } from '@mantine/core';
import { IconFolder, IconFolderOpen, IconSparkles, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { WeekStartDay } from '../../../types';

export const GeneralSettingsTab: React.FC = () => {
  const { t } = useTranslation();

  const {
    settings,
    updateSettings,
    setIsSettingsOpen,
    openOnboarding,
    loadSettings,
    refreshNotesList,
    refreshTasksList,
    loadNoteForDate,
    selectedDate,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
    setIsSettingsOpen: state.setIsSettingsOpen,
    openOnboarding: state.openOnboarding,
    loadSettings: state.loadSettings,
    refreshNotesList: state.refreshNotesList,
    refreshTasksList: state.refreshTasksList,
    loadNoteForDate: state.loadNoteForDate,
    selectedDate: state.selectedDate,
  }));

  if (!settings) return null;

  const handleChangeVault = async () => {
    if (!window.electronAPI) {
      notifications.show({
        title: t('settings.vaultLocation'),
        message: 'Changing folder requires running in the Electron desktop window.',
        color: 'blue',
      });
      return;
    }
    const selected = await window.electronAPI.selectVaultDirectory();
    if (selected) {
      await loadSettings();
      await refreshNotesList();
      await refreshTasksList();
      await loadNoteForDate(selectedDate);
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
        message: 'Native File Manager is available in the Electron desktop application window.',
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
          <Text
            size="xs"
            p="xs"
            style={{
              backgroundColor: 'var(--mantine-color-default-hover)',
              borderRadius: 6,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {settings.vaultPath}
          </Text>
          <Text size="xs" c="dimmed">
            {t('settings.vaultSyncHint')}
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

      {/* Auto Save */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="sm">
              {t('settings.autoSave')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.autoSaveDescription')}
            </Text>
          </div>
          <Switch
            checked={settings.autoSave}
            onChange={(e) => updateSettings({ autoSave: e.currentTarget.checked })}
          />
        </Group>
      </Paper>

      {/* Re-run Setup Wizard */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="center">
          <div style={{ flex: 1, paddingRight: 16 }}>
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
            onClick={() => {
              setIsSettingsOpen(false);
              openOnboarding();
            }}
          >
            {t('settings.rerunWizard')}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
};
