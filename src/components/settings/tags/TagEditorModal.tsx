import React, { useState, useEffect } from 'react';
import {
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconTag } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { TagDefinition } from '../../../types';
import { getTagColor, parseTagHierarchy, TAG_COLOR_PALETTE } from '../../../utils/tagUtils';

interface TagEditorModalProps {
  opened: boolean;
  onClose: () => void;
  editingTag: TagDefinition | null;
  isNewTag: boolean;
  allTags: TagDefinition[];
  onSave: (tagData: TagDefinition, oldName?: string) => Promise<void>;
}

export const TagEditorModal: React.FC<TagEditorModalProps> = ({
  opened,
  onClose,
  editingTag,
  isNewTag,
  allTags,
  onSave,
}) => {
  const { t } = useTranslation();

  const [formTagName, setFormTagName] = useState('');
  const [formService, setFormService] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formColor, setFormColor] = useState('teal');
  const [formDescription, setFormDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (editingTag) {
      const { service, project } = parseTagHierarchy(editingTag.name, allTags);
      setFormTagName(editingTag.name);
      setFormService(editingTag.service || service || '');
      setFormProject(editingTag.project || project || '');
      setFormColor(editingTag.color || getTagColor(editingTag.name, allTags));
      setFormDescription(editingTag.description || '');
    } else {
      setFormTagName('');
      setFormService('');
      setFormProject('');
      setFormColor('teal');
      setFormDescription('');
    }
  }, [editingTag, opened, allTags]);

  const handleTagNameChange = (val: string) => {
    const clean = val.replace(/^[#\s]+/, '');
    setFormTagName(clean);

    if (isNewTag && clean.includes('/')) {
      const parts = clean.split('/');
      const s = parts[0].trim();
      const p = parts.slice(1).join('/').trim();
      if (s) setFormService(s.charAt(0).toUpperCase() + s.slice(1));
      if (p) setFormProject(p);
    }
  };

  const handleSave = async () => {
    const cleanName = formTagName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanName) return;

    setIsProcessing(true);
    try {
      await onSave(
        {
          name: cleanName,
          service: formService.trim() || undefined,
          project: formProject.trim() || undefined,
          color: formColor,
          description: formDescription.trim() || undefined,
        },
        isNewTag ? undefined : editingTag?.name
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconTag size={18} color="var(--mantine-primary-color-filled)" />
          <Text fw={700} size="sm">
            {isNewTag
              ? t('tags.createTagTitle') || 'Create New Tag'
              : t('tags.editTagTitle') || `Edit Tag: #${editingTag?.name}`}
          </Text>
        </Group>
      }
      size="md"
      radius="md"
      centered
    >
      <Stack gap="sm">
        <TextInput
          label={t('tags.tagName') || 'Tag Name'}
          placeholder="e.g. billing/stripe, auth/login, devops"
          value={formTagName}
          onChange={(e) => handleTagNameChange(e.currentTarget.value)}
          description={t('tags.tagNameHelp') || 'Can use service/project syntax (e.g. backend/api)'}
          required
          autoFocus
          radius="md"
        />

        <Group grow align="flex-start">
          <TextInput
            label={t('tags.service') || 'Service / Area'}
            placeholder="e.g. Billing, Auth, Frontend"
            value={formService}
            onChange={(e) => setFormService(e.currentTarget.value)}
            radius="md"
          />
          <TextInput
            label={t('tags.project') || 'Project / Feature'}
            placeholder="e.g. Stripe Checkout, OAuth"
            value={formProject}
            onChange={(e) => setFormProject(e.currentTarget.value)}
            radius="md"
          />
        </Group>

        <div>
          <Text size="sm" fw={500} mb={6}>
            {t('tags.tagColor') || 'Tag Color'}
          </Text>
          <Group gap="xs">
            {TAG_COLOR_PALETTE.map((c) => (
              <ColorSwatch
                key={c}
                color={`var(--mantine-color-${c}-filled)`}
                size={26}
                style={{ cursor: 'pointer', transition: 'transform 0.1s ease' }}
                onClick={() => setFormColor(c)}
              >
                {formColor === c && <CheckIcon style={{ width: 12, height: 12, color: 'white' }} />}
              </ColorSwatch>
            ))}
          </Group>
        </div>

        <TextInput
          label={t('common.description') || 'Description'}
          placeholder="What this tag represents or which team owns it..."
          value={formDescription}
          onChange={(e) => setFormDescription(e.currentTarget.value)}
          radius="md"
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={isProcessing}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            loading={isProcessing}
            disabled={!formTagName.trim()}
          >
            {isNewTag ? t('common.create') || 'Create' : t('common.save') || 'Save'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
