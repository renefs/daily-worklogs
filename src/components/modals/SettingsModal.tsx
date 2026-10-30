import React from 'react';
import { Modal, Tabs, Group, Text, Button } from '@mantine/core';
import {
  IconSettings,
  IconPalette,
  IconFolder,
  IconLayoutKanban,
  IconChecklist,
  IconInfoCircle,
  IconTag,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { RoutinesManagerView } from './ManageRoutinesModal';
import { TagsManager } from '../settings/TagsManager';
import { AreasProjectsManager } from '../settings/AreasProjectsManager';
import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { KanbanSettingsTab } from './settings/KanbanSettingsTab';
import { AppearanceSettingsTab } from './settings/AppearanceSettingsTab';
import { AboutSettingsTab } from './settings/AboutSettingsTab';

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation();

  const {
    settings,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsActiveTab,
    setSettingsActiveTab,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    isSettingsOpen: state.isSettingsOpen,
    setIsSettingsOpen: state.setIsSettingsOpen,
    settingsActiveTab: state.settingsActiveTab,
    setSettingsActiveTab: state.setSettingsActiveTab,
  }));

  if (!settings) return null;

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
      <Tabs
        value={settingsActiveTab || 'general'}
        onChange={(val) => setSettingsActiveTab(val || 'general')}
        radius="md"
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
            {t('settings.general')}
          </Tabs.Tab>
          <Tabs.Tab value="areas" leftSection={<IconFolder size={16} />}>
            {t('settings.tabAreasProjects', 'Areas & Projects')}
          </Tabs.Tab>
          <Tabs.Tab value="kanban" leftSection={<IconLayoutKanban size={16} />}>
            {t('settings.kanbanColumns')}
          </Tabs.Tab>
          <Tabs.Tab value="tags" leftSection={<IconTag size={16} />}>
            {t('settings.tabTags')}
          </Tabs.Tab>
          <Tabs.Tab value="routines" leftSection={<IconChecklist size={16} />}>
            {t('settings.tabRoutines')}
          </Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
            {t('settings.appearance')}
          </Tabs.Tab>
          <Tabs.Tab value="about" leftSection={<IconInfoCircle size={16} />}>
            {t('settings.about')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <GeneralSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="areas">
          <AreasProjectsManager />
        </Tabs.Panel>

        <Tabs.Panel value="kanban">
          <KanbanSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="tags">
          <TagsManager />
        </Tabs.Panel>

        <Tabs.Panel value="routines">
          <RoutinesManagerView />
        </Tabs.Panel>

        <Tabs.Panel value="appearance">
          <AppearanceSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="about">
          <AboutSettingsTab />
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
