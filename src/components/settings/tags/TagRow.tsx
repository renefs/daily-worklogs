import React from 'react';
import {
  ActionIcon,
  Badge,
  ColorSwatch,
  Group,
  Paper,
  Text,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { TagDefinition } from '../../../types';
import { getTagColor, parseTagHierarchy } from '../../../utils/tagUtils';

interface TagRowProps {
  tag: TagDefinition;
  allTags: TagDefinition[];
  usageCount: number;
  onEdit: (tag: TagDefinition) => void;
  onDelete: (tag: TagDefinition) => void;
}

export const TagRow: React.FC<TagRowProps> = ({
  tag,
  allTags,
  usageCount,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { service, project } = parseTagHierarchy(tag.name, allTags);
  const tagColor = tag.color || getTagColor(tag.name, allTags);

  return (
    <Paper
      key={tag.name}
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
              #{tag.name}
            </Badge>
            {tag.description && (
              <Text size="xs" c="dimmed" fs="italic" mt={2} lineClamp={1}>
                {tag.description}
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
              {project || tag.name}
            </Text>
          </Group>
        </Group>

        {/* Right: Usage count and Actions */}
        <Group gap="xs" justify="flex-end" style={{ flexShrink: 0 }}>
          <Badge size="xs" variant="light" color="gray">
            {usageCount} {usageCount === 1 ? 'task' : 'tasks'}
          </Badge>

          <Tooltip label={t('common.edit') || 'Edit Tag'} withArrow>
            <ActionIcon size="sm" variant="subtle" onClick={() => onEdit(tag)}>
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('common.delete') || 'Delete Tag'} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => onDelete(tag)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
};
