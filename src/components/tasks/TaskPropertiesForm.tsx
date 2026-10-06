import React, { useMemo } from 'react';
import {
  Stack,
  Select,
  SegmentedControl,
  TagsInput,
  Badge,
  Group,
  Paper,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconCalendar,
  IconClockPlay,
  IconClockCheck,
  IconFolder,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  AreaDefinition,
  KanbanColumnConfig,
  ProjectDefinition,
  TagDefinition,
  TaskPriority,
  TaskStatus,
} from '../../types';
import { getColumnIcon, getColumnTitle } from '../kanban/columnUtils';
import { getTagColor } from '../../utils/tagUtils';
import { getAreaColor, resolveTaskContext } from '../../utils/areaProjectUtils';

export interface TaskPropertiesFormProps {
  area: string;
  onAreaChange: (val: string) => void;
  project: string | null;
  onProjectChange: (val: string | null) => void;
  status: TaskStatus;
  onStatusChange: (val: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (val: TaskPriority) => void;
  dueDate: Date | null;
  onDueDateChange: (val: Date | null) => void;
  startedDate: Date | null;
  onStartedDateChange: (val: Date | null) => void;
  completedDate: Date | null;
  onCompletedDateChange: (val: Date | null) => void;
  tags: string[];
  onTagsChange: (val: string[]) => void;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  availableColumns: KanbanColumnConfig[];
  allTags: TagDefinition[];
}

export const TaskPropertiesForm: React.FC<TaskPropertiesFormProps> = ({
  area,
  onAreaChange,
  project,
  onProjectChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  startedDate,
  onStartedDateChange,
  completedDate,
  onCompletedDateChange,
  tags,
  onTagsChange,
  areas,
  projects,
  availableColumns,
  allTags,
}) => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const currentAreaColor = getAreaColor(area, areas);

  const statusOptions = useMemo(() => {
    return availableColumns.map((col) => ({
      value: col.id,
      label: getColumnTitle(col, t),
      iconName: col.iconName,
      color: col.color || 'blue',
      behavior: col.behavior,
    }));
  }, [availableColumns, t]);

  const resolvedContext = useMemo(() => {
    return resolveTaskContext(
      { id: '', title: '', status, priority, area, project: project || undefined, tags },
      areas,
      projects,
      allTags
    );
  }, [area, project, status, priority, tags, areas, projects, allTags]);

  const availableProjects = useMemo(() => {
    return projects.filter((p) => !area || p.areaName.toLowerCase() === area.toLowerCase());
  }, [projects, area]);

  return (
    <Stack gap="sm">
      {/* Status Selector */}
      <Select
        label={t('tasks.status', 'Status')}
        value={status}
        onChange={(val) => val && onStatusChange(val as TaskStatus)}
        data={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
        allowDeselect={false}
        size="xs"
        radius="md"
        leftSection={
          statusOptions.find((o) => o.value === status) ? (
            <span
              style={{
                color: `var(--mantine-color-${
                  statusOptions.find((o) => o.value === status)?.color || 'blue'
                }-filled)`,
              }}
            >
              {getColumnIcon(statusOptions.find((o) => o.value === status)?.iconName, 15)}
            </span>
          ) : undefined
        }
      />

      {/* Priority Selector */}
      <div>
        <Text size="xs" fw={500} mb={4}>
          {t('tasks.priority', 'Priority')}
        </Text>
        <SegmentedControl
          value={priority}
          onChange={(val) => onPriorityChange(val as TaskPriority)}
          data={[
            { value: 'low', label: t('tasks.priorityLow') },
            { value: 'medium', label: t('tasks.priorityMedium') },
            { value: 'high', label: t('tasks.priorityHigh') },
            { value: 'urgent', label: t('tasks.priorityUrgent') },
          ]}
          size="xs"
          radius="md"
          fullWidth
          color={
            priority === 'urgent'
              ? 'red'
              : priority === 'high'
              ? 'orange'
              : priority === 'medium'
              ? 'blue'
              : 'gray'
          }
        />
      </div>

      {/* Area & Project */}
      <Select
        label={t('tasks.area', 'Area')}
        value={area}
        onChange={(val) => {
          if (val) {
            onAreaChange(val);
            if (project) {
              const matchedProject = projects.find((p) => p.name === project);
              if (matchedProject && matchedProject.areaName.toLowerCase() !== val.toLowerCase()) {
                onProjectChange(null);
              }
            }
          }
        }}
        data={areas.map((a) => ({ value: a.name, label: a.name }))}
        allowDeselect={false}
        size="xs"
        radius="md"
        leftSection={<IconFolder size={14} style={{ color: `var(--mantine-color-${currentAreaColor}-filled)` }} />}
      />

      <Select
        label={t('tasks.project', 'Project')}
        placeholder={t('tasks.selectProject', 'None (unassigned)')}
        value={project}
        onChange={onProjectChange}
        data={availableProjects.map((p) => ({ value: p.name, label: p.name }))}
        clearable
        size="xs"
        radius="md"
      />

      {/* Dates */}
      <DatePickerInput
        label={t('tasks.dueDate', 'Due Date')}
        placeholder={t('tasks.noDueDate', 'No due date')}
        value={dueDate}
        onChange={onDueDateChange}
        leftSection={<IconCalendar size={14} />}
        clearable
        size="xs"
        radius="md"
      />

      <DatePickerInput
        label={t('tasks.startedDate', 'Started Date')}
        placeholder={t('tasks.noStartedDate', 'Not started yet')}
        value={startedDate}
        onChange={onStartedDateChange}
        leftSection={<IconClockPlay size={14} />}
        clearable
        size="xs"
        radius="md"
      />

      <DatePickerInput
        label={t('tasks.completedDate', 'Completed Date')}
        placeholder={t('tasks.noCompletedDate', 'Not completed yet')}
        value={completedDate}
        onChange={onCompletedDateChange}
        leftSection={<IconClockCheck size={14} />}
        clearable
        size="xs"
        radius="md"
      />

      {/* Tags */}
      <div>
        <Text size="xs" fw={500} mb={4}>
          {t('tasks.contextTags', 'Tags')}
        </Text>
        {resolvedContext.inheritedTags.length > 0 && (
          <Paper
            p="xs"
            radius="sm"
            withBorder
            mb={6}
            style={{
              backgroundColor: isDark
                ? 'rgba(76, 110, 245, 0.05)'
                : 'rgba(76, 110, 245, 0.03)',
            }}
          >
            <Group gap={4} wrap="wrap">
              {resolvedContext.inheritedTags.map((tg) => (
                <Badge key={tg} size="xs" color={currentAreaColor} variant="dot">
                  #{tg}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}

        <TagsInput
          placeholder={t('tasks.addTagPlaceholder')}
          value={tags}
          onChange={onTagsChange}
          data={allTags.map((t) => t.name)}
          clearable
          size="xs"
          radius="md"
          renderOption={({ option }) => {
            const tagColor = getTagColor(option.value, allTags);
            return (
              <Badge size="xs" color={tagColor} variant="light">
                #{option.value}
              </Badge>
            );
          }}
        />
      </div>
    </Stack>
  );
};
