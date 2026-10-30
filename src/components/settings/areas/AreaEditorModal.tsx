import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Group,
  Text,
  Button,
  ThemeIcon,
  TagsInput,
} from '@mantine/core';
import {
  IconFolder,
  IconBroadcast,
  IconVideo,
  IconMicrophone,
  IconServer,
  IconCode,
  IconFlame,
  IconBriefcase,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AreaDefinition } from '../../../types';
import { AREA_COLOR_PALETTE } from '../../../utils/areaProjectUtils';
import { ColorSwatchPicker } from '../appearance/ColorSwatchPicker';

export const AVAILABLE_ICONS = [
  { value: 'folder', label: 'Folder', icon: <IconFolder size={16} /> },
  { value: 'broadcast', label: 'Broadcast / Webcast', icon: <IconBroadcast size={16} /> },
  { value: 'video', label: 'Video / VC', icon: <IconVideo size={16} /> },
  { value: 'microphone', label: 'Audio / ASR', icon: <IconMicrophone size={16} /> },
  { value: 'server', label: 'Server / Infra', icon: <IconServer size={16} /> },
  { value: 'code', label: 'Code / Dev', icon: <IconCode size={16} /> },
  { value: 'briefcase', label: 'Briefcase / Ops', icon: <IconBriefcase size={16} /> },
  { value: 'flame', label: 'Flame / Urgent', icon: <IconFlame size={16} /> },
];

export function renderIconByName(name?: string, size = 16) {
  switch (name) {
    case 'broadcast':
      return <IconBroadcast size={size} />;
    case 'video':
      return <IconVideo size={size} />;
    case 'microphone':
      return <IconMicrophone size={size} />;
    case 'server':
      return <IconServer size={size} />;
    case 'code':
      return <IconCode size={size} />;
    case 'briefcase':
      return <IconBriefcase size={size} />;
    case 'flame':
      return <IconFlame size={size} />;
    default:
      return <IconFolder size={size} />;
  }
}

export interface AreaEditorModalProps {
  opened: boolean;
  onClose: () => void;
  editingArea: AreaDefinition | null;
  onSave: (area: AreaDefinition, oldName?: string) => Promise<void> | void;
}

export const AreaEditorModal: React.FC<AreaEditorModalProps> = ({
  opened,
  onClose,
  editingArea,
  onSave,
}) => {
  const { t } = useTranslation();

  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState('indigo');
  const [areaIcon, setAreaIcon] = useState('folder');
  const [areaDescription, setAreaDescription] = useState('');
  const [areaDefaultTags, setAreaDefaultTags] = useState<string[]>([]);

  useEffect(() => {
    if (opened) {
      if (editingArea) {
        setAreaName(editingArea.name);
        setAreaColor(editingArea.color || 'indigo');
        setAreaIcon(editingArea.icon || 'folder');
        setAreaDescription(editingArea.description || '');
        setAreaDefaultTags(editingArea.defaultTags || []);
      } else {
        setAreaName('');
        setAreaColor('indigo');
        setAreaIcon('folder');
        setAreaDescription('');
        setAreaDefaultTags([]);
      }
    }
  }, [opened, editingArea]);

  const handleSave = async () => {
    const cleanName = areaName.trim();
    if (!cleanName) return;

    await onSave(
      {
        id: editingArea?.id || cleanName.toLowerCase().replace(/\s+/g, '-'),
        name: cleanName,
        color: areaColor,
        icon: areaIcon,
        description: areaDescription.trim() || undefined,
        defaultTags: areaDefaultTags,
      },
      editingArea?.name
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color={areaColor} variant="light" size="md" radius="md">
            {renderIconByName(areaIcon, 18)}
          </ThemeIcon>
          <Text fw={700}>
            {editingArea
              ? t('areas.editAreaTitle', 'Edit Area')
              : t('areas.createAreaTitle', 'Create Permanent Area')}
          </Text>
        </Group>
      }
      size="md"
      radius="md"
    >
      <Stack gap="md">
        <TextInput
          label={t('areas.areaName', 'Area Name')}
          placeholder="e.g. Webcast, VC, ASR, Infra, Marketing..."
          required
          value={areaName}
          onChange={(e) => setAreaName(e.currentTarget.value)}
          data-autofocus
        />

        <Select
          label={t('areas.areaIcon', 'Area Icon')}
          value={areaIcon}
          onChange={(val) => setAreaIcon(val || 'folder')}
          data={AVAILABLE_ICONS.map((i) => ({
            value: i.value,
            label: i.label,
          }))}
          leftSection={renderIconByName(areaIcon, 16)}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>
            {t('areas.areaColor', 'Area Color')}
          </Text>
          <ColorSwatchPicker
            colors={AREA_COLOR_PALETTE}
            value={areaColor}
            onChange={setAreaColor}
            label={t('areas.areaColor', 'Area Color')}
          />
        </div>

        <TagsInput
          label={t('areas.defaultInheritedTags', 'Default Inherited Tags')}
          description={t(
            'areas.defaultTagsHelp',
            'All tasks created inside this Area will automatically inherit these tags'
          )}
          placeholder="e.g. webcast, streaming (press enter)"
          value={areaDefaultTags}
          onChange={setAreaDefaultTags}
          clearable
        />

        <TextInput
          label={t('areas.description', 'Description')}
          placeholder="Continuous domain of responsibility..."
          value={areaDescription}
          onChange={(e) => setAreaDescription(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button color="indigo" onClick={handleSave} disabled={!areaName.trim()}>
            {t('common.save', 'Save Area')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
