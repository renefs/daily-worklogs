import React from 'react';
import {
  Badge,
  Group,
  Paper,
  Progress,
  Text,
  ThemeIcon,
  Tooltip,
  ActionIcon,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconCalendar,
  IconEdit,
  IconTarget,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { AreaDefinition, ProjectDefinition, TagDefinition, TaskMeta } from '../../../types';
import {
  calculateProjectProgress,
  getProjectColor,
} from '../../../utils/areaProjectUtils';

interface ProjectCardProps {
  project: ProjectDefinition;
  areaName: string;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  tasks: TaskMeta[];
  allTags?: TagDefinition[];
  onEdit: (project: ProjectDefinition) => void;
  onDelete: (project: ProjectDefinition) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  areaName,
  areas,
  projects,
  tasks,
  allTags,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const projCol = getProjectColor(project.name, areaName, projects, areas);
  const metrics = calculateProjectProgress(project.name, areaName, tasks, areas, projects, allTags);

  return (
    <Paper
      key={project.id || project.name}
      p="xs"
      radius="sm"
      withBorder
      style={{
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap">
        <div style={{ flex: 1, minWidth: 200 }}>
          <Group gap="xs" align="center">
            <ThemeIcon color={projCol} variant="dot" size="sm">
              <IconTarget size={12} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              {project.name}
            </Text>
            {project.status && (
              <Badge
                size="xs"
                color={
                  project.status === 'completed'
                    ? 'teal'
                    : project.status === 'on_hold'
                    ? 'yellow'
                    : project.status === 'archived'
                    ? 'gray'
                    : 'blue'
                }
                variant="light"
              >
                {project.status}
              </Badge>
            )}
            {project.targetDate && (
              <Badge
                size="xs"
                color={project.targetDate < dayjs().format('YYYY-MM-DD') ? 'red' : 'gray'}
                variant="outline"
                leftSection={<IconCalendar size={10} />}
              >
                {dayjs(project.targetDate).format('MMM D, YYYY')}
              </Badge>
            )}
          </Group>

          {project.description && (
            <Text size="xs" c="dimmed" mt={2} lineClamp={1}>
              {project.description}
            </Text>
          )}

          <Group gap="xs" align="center" mt={6} style={{ width: '100%', maxWidth: 360 }}>
            <Progress
              value={metrics.percent}
              color={metrics.percent === 100 ? 'teal' : projCol}
              size="sm"
              radius="xl"
              style={{ flex: 1 }}
            />
            <Text size="xs" fw={600} c={metrics.percent === 100 ? 'teal' : 'dimmed'}>
              {metrics.percent}% ({metrics.completed}/{metrics.total})
            </Text>
          </Group>
        </div>

        <Group gap={4}>
          <Tooltip label={t('common.edit', 'Edit')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => onEdit(project)}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('common.delete', 'Delete')} withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => onDelete(project)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
};
