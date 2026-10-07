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
import { getTagColor, TAG_COLOR_PALETTE } from '../../../utils/tagUtils';

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
  const [formColor, setFormColor] = useState('teal');
  const [formDescription, setFormDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (editingTag) {
      setFormTagName(editingTag.name);
      setFormColor(editingTag.color || getTagColor(editingTag.name, allTags));
      setFormDescription(editingTag.description || '');
    } else {
      setFormTagName('');
      setFormColor('teal');
      setFormDescription('');
    }
  }, [editingTag, opened, allTags]);

  const handleTagNameChange = (val: string) => {
    setFormTagName(val.replace(/^[#\s]+/, ''));
  };

  const handleSave = async () => {
    const cleanName = formTagName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanName) return;

    setIsProcessing(true);
    try {
      await onSave(
        {
          name: cleanName,
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
          label={t('tags.tagName')}
          placeholder={t('tags.tagNamePlaceholder')}
          value={formTagName}
          onChange={(e) => handleTagNameChange(e.currentTarget.value)}
          description={t('tags.tagNameHelp')}
          required
          autoFocus
          radius="md"
        />

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
          label={t('tags.description')}
          placeholder={t('tags.descriptionPlaceholder')}
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
