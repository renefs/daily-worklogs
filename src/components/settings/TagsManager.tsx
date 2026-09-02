import React, { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Select,
  Badge,
  Paper,
  ActionIcon,
  Tooltip,
  Modal,
  ColorSwatch,
  CheckIcon,
  Checkbox,
  ThemeIcon,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconTag,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconFolders,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { TagDefinition } from '../../types';
import { getTagColor, parseTagHierarchy, TAG_COLOR_PALETTE } from '../../utils/tagUtils';

export const TagsManager: React.FC = () => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

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
  const [serviceFilter, setServiceFilter] = useState('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [isNewTag, setIsNewTag] = useState(false);

  // Form states
  const [formTagName, setFormTagName] = useState('');
  const [formService, setFormService] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formColor, setFormColor] = useState('teal');
  const [formDescription, setFormDescription] = useState('');

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

  // Extract unique services
  const existingServices = useMemo(() => {
    const sSet = new Set<string>();
    for (const tg of allTags) {
      const { service } = parseTagHierarchy(tg.name, allTags);
      if (service) sSet.add(service);
    }
    return Array.from(sSet).sort();
  }, [allTags]);

  // Filtered tags list
  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allTags.filter((tg) => {
      const { service, project } = parseTagHierarchy(tg.name, allTags);
      if (serviceFilter !== 'all' && service.toLowerCase() !== serviceFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        tg.name.toLowerCase().includes(q) ||
        service.toLowerCase().includes(q) ||
        project.toLowerCase().includes(q) ||
        (tg.description && tg.description.toLowerCase().includes(q))
      );
    });
  }, [allTags, search, serviceFilter]);

  const handleOpenAdd = () => {
    setIsNewTag(true);
    setEditingTag(null);
    setFormTagName('');
    setFormService('');
    setFormProject('');
    setFormColor('teal');
    setFormDescription('');
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (tag: TagDefinition) => {
    setIsNewTag(false);
    setEditingTag(tag);
    const { service, project } = parseTagHierarchy(tag.name, allTags);
    setFormTagName(tag.name);
    setFormService(tag.service || service || '');
    setFormProject(tag.project || project || '');
    setFormColor(tag.color || getTagColor(tag.name, allTags));
    setFormDescription(tag.description || '');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (tag: TagDefinition) => {
    setTagToDelete(tag);
    setRemoveFromTasks(true);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    const cleanName = formTagName.trim().replace(/^#+/, '');
    if (!cleanName) return;

    setIsProcessing(true);
    try {
      if (isNewTag) {
        await saveTagDefinition({
          name: cleanName,
          service: formService.trim() || undefined,
          project: formProject.trim() || undefined,
          color: formColor,
          description: formDescription.trim() || undefined,
        });
        notifications.show({
          title: t('tags.tagCreated') || 'Tag Created',
          message: `#${cleanName}`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      } else if (editingTag) {
        // If renamed
        if (editingTag.name.toLowerCase() !== cleanName.toLowerCase()) {
          const count = await renameTag(editingTag.name, cleanName);
          notifications.show({
            title: t('tags.tagRenamed') || 'Tag Renamed',
            message: `Updated in ${count} task(s)`,
            color: 'teal',
            icon: <IconCheck size={16} />,
          });
        }
        // Save definition metadata
        await saveTagDefinition({
          name: cleanName,
          service: formService.trim() || undefined,
          project: formProject.trim() || undefined,
          color: formColor,
          description: formDescription.trim() || undefined,
        });
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save tag:', err);
      notifications.show({
        title: t('common.error') || 'Error',
        message: err?.message || 'Failed to save tag',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;
    setIsProcessing(true);
    try {
      const count = await deleteTag(tagToDelete.name, removeFromTasks);
      notifications.show({
        title: t('tags.tagDeleted') || 'Tag Deleted',
        message: removeFromTasks
          ? `Removed from ${count} task(s)`
          : `#${tagToDelete.name} definition removed`,
        color: 'red',
        icon: <IconTrash size={16} />,
      });
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Failed to delete tag:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-fill service/project if user types hierarchy in name
  const handleTagNameChange = (val: string) => {
    setFormTagName(val);
    if (isNewTag && (val.includes('/') || val.includes(':'))) {
      const separator = val.includes('/') ? '/' : ':';
      const parts = val.split(separator);
      const s = parts[0].trim();
      const p = parts.slice(1).join(separator).trim();
      if (s && !formService) {
        setFormService(s.charAt(0).toUpperCase() + s.slice(1));
      }
      if (p && !formProject) {
        setFormProject(p);
      }
    }
  };

  return (
    <Stack gap="md">
      {/* Header controls */}
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Text fw={700} size="md">
            {t('tags.managerTitle') || 'Tags, Projects & Services'}
          </Text>
          <Text size="xs" c="dimmed">
            {t('tags.managerSubtitle') ||
              'Organize tags into Services and Projects, assign colors, and manage tags across your vault.'}
          </Text>
        </div>
        <Group gap="xs">
          <Button
            size="xs"
            variant="default"
            leftSection={<IconRefresh size={14} />}
            onClick={() => refreshTagsList()}
          >
            {t('common.refresh') || 'Refresh'}
          </Button>
          <Button
            size="xs"
            variant="filled"
            leftSection={<IconPlus size={14} />}
            onClick={handleOpenAdd}
          >
            {t('tags.addTag') || 'New Tag'}
          </Button>
        </Group>
      </Group>

      {/* Filter and Search Bar */}
      <Paper p="xs" withBorder radius="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <TextInput
            placeholder={t('tags.searchTags') || 'Search tags, services, projects...'}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            size="xs"
            style={{ flex: 1, minWidth: 200 }}
            radius="md"
          />

          <Select
            placeholder="Filter by Service"
            value={serviceFilter}
            onChange={(val) => val && setServiceFilter(val)}
            data={[
              { value: 'all', label: 'All Services' },
              ...existingServices.map((s) => ({ value: s, label: s })),
            ]}
            leftSection={<IconFolders size={14} />}
            size="xs"
            radius="md"
            style={{ width: 180 }}
            allowDeselect={false}
          />
        </Group>
      </Paper>

      {/* Tags Rows List */}
      {filteredTags.length === 0 ? (
        <Paper withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
          <ThemeIcon size="lg" radius="xl" variant="light" color="gray" mb="xs">
            <IconTag size={20} />
          </ThemeIcon>
          <Text size="sm" fw={600} c="dimmed">
            {t('tags.noTagsFound') || 'No tags found'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Create your first tag or tag tasks with #service/project in your notes.
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
          {filteredTags.map((tg) => {
            const { service, project } = parseTagHierarchy(tg.name, allTags);
            const tagColor = tg.color || getTagColor(tg.name, allTags);
            const usageCount = tagUsageMap.get(tg.name.toLowerCase().trim()) || 0;

            return (
              <Paper
                key={tg.name}
                withBorder
                radius="md"
                p="xs"
                style={{
                  transition: 'all 0.15s ease',
                  backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-body)',
                }}
              >
                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                  {/* Left: Tag Badge, Swatch, and Description */}
                  <Group gap="xs" style={{ minWidth: 200, flex: '1 1 200px' }}>
                    <ColorSwatch
                      color={`var(--mantine-color-${tagColor}-filled)`}
                      size={18}
                      radius="sm"
                    />
                    <div>
                      <Badge
                        size="md"
                        color={tagColor}
                        variant="light"
                        radius="sm"
                        style={{ fontSize: '13px', textTransform: 'none' }}
                      >
                        #{tg.name}
                      </Badge>
                      {tg.description && (
                        <Text size="xs" c="dimmed" fs="italic" mt={2} lineClamp={1}>
                          {tg.description}
                        </Text>
                      )}
                    </div>
                  </Group>

                  {/* Middle: Service & Project */}
                  <Group gap="md" style={{ flex: '1 1 260px' }}>
                    <Group gap={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Service:
                      </Text>
                      <Badge size="xs" color="indigo" variant="outline">
                        {service || 'General'}
                      </Badge>
                    </Group>

                    <Group gap={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Project:
                      </Text>
                      <Text size="xs" fw={600}>
                        {project || tg.name}
                      </Text>
                    </Group>
                  </Group>

                  {/* Right: Usage count and Actions */}
                  <Group gap="xs" justify="flex-end" style={{ flexShrink: 0 }}>
                    <Badge size="xs" variant="light" color="gray">
                      {usageCount} {usageCount === 1 ? 'task' : 'tasks'}
                    </Badge>

                    <Tooltip label={t('common.edit') || 'Edit Tag'} withArrow>
                      <ActionIcon size="sm" variant="subtle" onClick={() => handleOpenEdit(tg)}>
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label={t('common.delete') || 'Delete Tag'} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleOpenDelete(tg)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Create / Edit Tag Modal */}
      <Modal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
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
                  {formColor === c && <CheckIcon size={12} color="#fff" />}
                </ColorSwatch>
              ))}
            </Group>
          </div>

          <TextInput
            label={t('tags.description') || 'Description (optional)'}
            placeholder="Short description of this project or tag"
            value={formDescription}
            onChange={(e) => setFormDescription(e.currentTarget.value)}
            radius="md"
          />

          {!isNewTag && editingTag && editingTag.name !== formTagName.trim() && (
            <Paper p="xs" withBorder radius="md" style={{ borderColor: 'var(--mantine-color-orange-4)' }}>
              <Group gap="xs" align="flex-start">
                <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                <Text size="xs" c="orange">
                  Renaming from <b>#{editingTag.name}</b> to <b>#{formTagName.trim()}</b> will automatically update all existing task markdown files across your vault.
                </Text>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsEditModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={isProcessing} onClick={handleSave}>
              {isNewTag ? t('common.create') || 'Create' : t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Tag Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={
          <Group gap="xs">
            <IconTrash size={18} color="red" />
            <Text fw={700} size="sm" c="red">
              {t('tags.deleteTagTitle') || `Delete Tag: #${tagToDelete?.name}`}
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            Are you sure you want to delete tag <b>#{tagToDelete?.name}</b>?
          </Text>

          <Checkbox
            label="Remove this tag from all existing tasks"
            checked={removeFromTasks}
            onChange={(e) => setRemoveFromTasks(e.currentTarget.checked)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button color="red" loading={isProcessing} onClick={handleDeleteConfirm}>
              {t('common.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
