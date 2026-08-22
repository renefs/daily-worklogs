import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  Group,
  Text,
  Button,
  Select,
  SegmentedControl,
  Slider,
  Switch,
  ColorSwatch,
  CheckIcon,
  Paper,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconSettings,
  IconPalette,
  IconTemplate,
  IconFolder,
  IconFolderOpen,
  IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

const THEME_COLORS = [
  'indigo',
  'teal',
  'blue',
  'violet',
  'cyan',
  'green',
  'orange',
  'grape',
  'pink',
];

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();
  const {
    settings,
    updateSettings,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<string | null>('general');

  if (!settings) return null;

  const handleChangeVault = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectVaultDirectory();
    if (selected) {
      notifications.show({
        title: t('settings.vaultLocation'),
        message: selected,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleOpenInFinder = () => {
    if (window.electronAPI) {
      window.electronAPI.openInFileManager(settings.vaultPath);
    }
  };

  const handleLanguageChange = (lang: string | null) => {
    if (lang === 'en' || lang === 'es') {
      updateSettings({ language: lang });
    }
  };

  const handleColorSchemeChange = (mode: 'light' | 'dark' | 'auto') => {
    updateSettings({ colorScheme: mode });
    setColorScheme(mode);
  };

  const handleThemeColorChange = (color: string) => {
    updateSettings({ themeColor: color });
  };

  const handleWeekStartChange = (val: string) => {
    updateSettings({ weekStartDay: parseInt(val, 10) as any });
  };

  const handleTemplateChange = (templateId: string | null) => {
    if (templateId) {
      updateSettings({ defaultTemplateId: templateId });
    }
  };

  return (
    <Modal
      opened={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title={
        <Group gap="xs">
          <IconSettings size={20} />
          <Text fw={700} size="lg">
            {t('settings.title')}
          </Text>
        </Group>
      }
      size="lg"
      centered
      radius="md"
    >
      <Tabs value={activeTab} onChange={setActiveTab} radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
            {t('settings.general')}
          </Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
            {t('settings.appearance')}
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            {t('settings.templates')}
          </Tabs.Tab>
        </Tabs.List>

        {/* General Tab */}
        <Tabs.Panel value="general">
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
                    { value: 'en', label: 'English (Default)' },
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
                <SegmentedControl
                  value={String(settings.weekStartDay)}
                  onChange={handleWeekStartChange}
                  data={[
                    { value: '1', label: t('settings.monday') },
                    { value: '0', label: t('settings.sunday') },
                    { value: '6', label: t('settings.saturday') },
                  ]}
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
          </Stack>
        </Tabs.Panel>

        {/* Appearance Tab */}
        <Tabs.Panel value="appearance">
          <Stack gap="lg">
            {/* Color Mode */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  {t('settings.colorScheme')}
                </Text>
                <SegmentedControl
                  value={settings.colorScheme}
                  onChange={(val) => handleColorSchemeChange(val as any)}
                  data={[
                    { value: 'light', label: t('settings.light') },
                    { value: 'dark', label: t('settings.dark') },
                    { value: 'auto', label: t('settings.auto') },
                  ]}
                  size="sm"
                />
              </Stack>
            </Paper>

            {/* Theme Accent Color */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  {t('settings.themeColor')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('settings.themeDescription')}
                </Text>
                <Group gap="sm" mt="xs">
                  {THEME_COLORS.map((color) => (
                    <ColorSwatch
                      key={color}
                      color={`var(--mantine-color-${color}-6)`}
                      size={32}
                      radius="md"
                      style={{ color: '#fff', cursor: 'pointer' }}
                      onClick={() => handleThemeColorChange(color)}
                    >
                      {settings.themeColor === color && <CheckIcon width={14} />}
                    </ColorSwatch>
                  ))}
                </Group>
              </Stack>
            </Paper>

            {/* Font Size */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={600} size="sm">
                    {t('settings.fontSize')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {settings.editorFontSize}px
                  </Text>
                </Group>
                <Slider
                  value={settings.editorFontSize}
                  onChange={(val) => updateSettings({ editorFontSize: val })}
                  min={12}
                  max={24}
                  step={1}
                  marks={[
                    { value: 12, label: '12' },
                    { value: 15, label: '15' },
                    { value: 18, label: '18' },
                    { value: 24, label: '24' },
                  ]}
                  mb="sm"
                />
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Templates Tab */}
        <Tabs.Panel value="templates">
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  {t('settings.defaultTemplate')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('settings.defaultTemplateDescription')}
                </Text>
                <Select
                  value={settings.defaultTemplateId}
                  onChange={handleTemplateChange}
                  data={settings.templates.map((tpl) => ({
                    value: tpl.id,
                    label: tpl.name,
                  }))}
                  allowDeselect={false}
                  size="sm"
                />
              </Stack>
            </Paper>

            {/* Template previews */}
            {settings.templates.map((tpl) => (
              <Paper key={tpl.id} withBorder p="sm" radius="md">
                <Group justify="space-between" mb={4}>
                  <Text fw={600} size="sm">
                    {tpl.name}
                  </Text>
                  {tpl.id === settings.defaultTemplateId && (
                    <Text size="xs" c="primary" fw={700}>
                      ✓ Default
                    </Text>
                  )}
                </Group>
                {tpl.description && (
                  <Text size="xs" c="dimmed" mb={8}>
                    {tpl.description}
                  </Text>
                )}
                <pre
                  style={{
                    backgroundColor: 'var(--mantine-color-default-hover)',
                    padding: 8,
                    borderRadius: 6,
                    fontSize: 12,
                    maxHeight: 120,
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {tpl.content}
                </pre>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Group justify="flex-end" mt="xl">
        <Button onClick={() => setIsSettingsOpen(false)} radius="md">
          {t('common.close')}
        </Button>
      </Group>
    </Modal>
  );
};
