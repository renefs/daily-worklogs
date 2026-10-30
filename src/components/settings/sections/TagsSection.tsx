import React, { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Badge,
  Paper,
  Modal,
  Checkbox,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconTag,
  IconPlus,
  IconSearch,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { TagDefinition } from '../../../types';
import { TagRow } from '../tags/TagRow';
import { TagEditorModal } from '../tags/TagEditorModal';
import { SettingsSection } from '../SettingsSection';
import classes from './TagsSection.module.css';

export const TagsSection: React.FC = () => {
  const { t } = useTranslation();

  const {
    allTags,
    tasks,
    refreshTagsList,
    saveTagDefinition,
    renameTag,
    deleteTag,
  } = useAppStoreSelector((state) => ({
    allTags: state.allTags,
    tasks: state.tasks,
    refreshTagsList: state.refreshTagsList,
    saveTagDefinition: state.saveTagDefinition,
    renameTag: state.renameTag,
    deleteTag: state.deleteTag,
  }));

  const [search, setSearch] = useState('');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [isNewTag, setIsNewTag] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagDefinition | null>(null);
  const [removeFromTasks, setRemoveFromTasks] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate tag usage counts from tasks
  const tagUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (task.tags && Array.isArray(task.tags)) {
        for (const tg of task.tags) {
          const lower = String(tg).toLowerCase().trim();
          map.set(lower, (map.get(lower) || 0) + 1);
        }
      }
    }
    return map;
  }, [tasks]);

  // Filtered tags list
  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allTags;
    return allTags.filter(
      (tg) =>
        tg.name.toLowerCase().includes(q) ||
        (tg.description && tg.description.toLowerCase().includes(q))
    );
  }, [allTags, search]);

  const handleOpenAdd = () => {
    setIsNewTag(true);
    setEditingTag(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (tag: TagDefinition) => {
    setIsNewTag(false);
    setEditingTag(tag);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (tag: TagDefinition) => {
    setTagToDelete(tag);
    setRemoveFromTasks(true);
    setIsDeleteModalOpen(true);
  };

  const handleSaveTag = async (tagData: TagDefinition, oldName?: string) => {
    if (!oldName) {
      await saveTagDefinition(tagData);
      notifications.show({
        title: t('tags.tagCreated') || 'Tag Created',
        message: `#${tagData.name}`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } else {
      if (oldName !== tagData.name) {
        await renameTag(oldName, tagData.name);
      }
      await saveTagDefinition(tagData);
      notifications.show({
        title: t('tags.tagUpdated') || 'Tag Updated',
        message: `#${tagData.name}`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    setIsProcessing(true);
    try {
      await deleteTag(tagToDelete.name, removeFromTasks);
      notifications.show({
        title: t('tags.tagDeleted') || 'Tag Deleted',
        message: `#${tagToDelete.name}`,
        color: 'red',
      });
      setIsDeleteModalOpen(false);
      setTagToDelete(null);
    } catch {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('tags.deleteFailed'),
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const actions = (
    <>
      <Badge size="sm" variant="light">
        {allTags.length} {t('tags.registeredTags')}
      </Badge>
      <Tooltip label={t('tags.scanTooltip')} withArrow>
        <Button variant="default" size="sm" leftSection={<IconRefresh size={14} />} onClick={refreshTagsList}>
          {t('tags.refreshTags')}
        </Button>
      </Tooltip>
      <Button leftSection={<IconPlus size={16} />} variant="filled" size="sm" onClick={handleOpenAdd}>
        {t('tags.newTag')}
      </Button>
    </>
  );

  const searchField = (
    <TextInput
      aria-label={t('tags.searchTags')}
      placeholder={t('tags.searchTags')}
      leftSection={<IconSearch size={15} />}
      value={search}
      onChange={(e) => setSearch(e.currentTarget.value)}
      size="sm"
      className={classes.searchInput}
    />
  );

  return (
    <SettingsSection
      title={t('tags.managerTitle')}
      description={t('tags.managerSubtitle')}
      actions={actions}
      search={searchField}
      scope="vault"
    >
      {/* Tags Rows List */}
      {filteredTags.length === 0 ? (
        <Paper withBorder radius="md" p="xl" className={classes.emptyState}>
          <ThemeIcon size="lg" radius="xl" variant="light" color="gray" mb="xs">
            <IconTag size={20} />
          </ThemeIcon>
          <Text size="sm" fw={600} c="dimmed">
            {t('tags.noTagsFound') || 'No tags found'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('tags.emptyHint')}
          </Text>
          <Button
            size="xs"
            variant="light"
            mt="md"
            leftSection={<IconPlus size={14} />}
            onClick={handleOpenAdd}
          >
            {t('tags.createFirstTag') || 'Create Tag'}
          </Button>
        </Paper>
      ) : (
        <Stack gap="xs">
          {filteredTags.map((tg) => (
            <TagRow
              key={tg.name}
              tag={tg}
              allTags={allTags}
              usageCount={tagUsageMap.get(tg.name.toLowerCase().trim()) || 0}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </Stack>
      )}

      {/* Create / Edit Tag Modal */}
      <TagEditorModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingTag={editingTag}
        isNewTag={isNewTag}
        allTags={allTags}
        onSave={handleSaveTag}
      />

      {/* Delete Tag Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-filled)" />
            <Text fw={700} size="sm">
              {t('tags.deleteTagTitle') || `Delete Tag: #${tagToDelete?.name}`}
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {t('tags.deleteTagConfirm') ||
              `Are you sure you want to delete the tag #${tagToDelete?.name}?`}
          </Text>

          <Checkbox
            label={
              <Text size="xs">
                {t('tags.removeFromTasksCheck') ||
                  `Remove #${tagToDelete?.name} from all tasks currently using it`}
              </Text>
            }
            checked={removeFromTasks}
            onChange={(e) => setRemoveFromTasks(e.currentTarget.checked)}
            color="red"
          />

          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isProcessing}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={isProcessing}
            >
              {t('common.delete') || 'Delete'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </SettingsSection>
  );
};
