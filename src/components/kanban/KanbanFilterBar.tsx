import React from 'react';
import { Paper, Group, TextInput, Select } from '@mantine/core';
import { IconSearch, IconFolder, IconFilter, IconTag } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ProjectDefinition } from '../../types';

export interface KanbanFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedProject: string;
  onProjectChange: (value: string) => void;
  projects: ProjectDefinition[];
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  allTags: string[];
}

export const KanbanFilterBar: React.FC<KanbanFilterBarProps> = ({
  search,
  onSearchChange,
  selectedProject,
  onProjectChange,
  projects,
  priorityFilter,
  onPriorityFilterChange,
  tagFilter,
  onTagFilterChange,
  allTags,
}) => {
  const { t } = useTranslation();

  return (
    <Paper
      p="xs"
      withBorder
      radius="md"
      style={{
        backgroundColor: 'var(--app-card-bg)',
        borderColor: 'var(--app-card-border)',
      }}
    >
      <Group justify="space-between" gap="xs">
        <TextInput
          placeholder={t('tasks.searchPlaceholder')}
          leftSection={<IconSearch size={14} style={{ color: 'var(--app-sidebar-text-dimmed)' }} />}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          radius="md"
          size="xs"
          style={{ flex: '1 1 180px', minWidth: 150 }}
        />

        <Group gap="xs">
          {/* Project Filter */}
          <Select
            placeholder={t('dashboard.allProjects', 'All projects')}
            leftSection={<IconFolder size={13} />}
            value={selectedProject}
            onChange={(val) => val && onProjectChange(val)}
            data={[
              { value: 'all', label: t('dashboard.allProjects', 'All projects') },
              ...projects.map((p) => ({ value: p.name, label: p.name })),
            ]}
            radius="md"
            size="xs"
            style={{ width: 160 }}
            allowDeselect={false}
          />

          {/* Priority Filter */}
          <Select
            placeholder={t('tasks.filterByPriority')}
            leftSection={<IconFilter size={13} />}
            value={priorityFilter}
            onChange={(val) => val && onPriorityFilterChange(val)}
            data={[
              { value: 'all', label: t('dashboard.allPriorities', 'All priorities') },
              { value: 'urgent', label: t('tasks.priorityUrgent') },
              { value: 'high', label: t('tasks.priorityHigh') },
              { value: 'medium', label: t('tasks.priorityMedium') },
              { value: 'low', label: t('tasks.priorityLow') },
            ]}
            radius="md"
            size="xs"
            style={{ width: 140 }}
            allowDeselect={false}
          />

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <Select
              placeholder={t('tasks.filterByTag')}
              leftSection={<IconTag size={13} />}
              value={tagFilter}
              onChange={(val) => val && onTagFilterChange(val)}
              data={[
                { value: 'all', label: t('dashboard.allTags', 'All tags') },
                ...allTags.map((tag) => ({ value: tag, label: `#${tag}` })),
              ]}
              radius="md"
              size="xs"
              style={{ width: 140 }}
              allowDeselect={false}
            />
          )}
        </Group>
      </Group>
    </Paper>
  );
};
