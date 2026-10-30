import React from 'react';
import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconEdit,
  IconPlus,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AreaDefinition, ProjectDefinition, TagDefinition, TaskMeta } from '../../../types';
import {
  calculateAreaMetrics,
  getAreaColor,
  getAreaIcon,
} from '../../../utils/areaProjectUtils';
import { renderIconByName } from './AreaEditorModal';
import { ProjectCard } from './ProjectCard';

interface AreaCardProps {
  area: AreaDefinition;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  tasks: TaskMeta[];
  allTags: TagDefinition[];
  onAddProject: (areaName: string) => void;
  onEditArea: (area: AreaDefinition) => void;
  onDeleteArea: (area: AreaDefinition) => void;
  onEditProject: (project: ProjectDefinition) => void;
  onDeleteProject: (project: ProjectDefinition) => void;
}

export const AreaCard: React.FC<AreaCardProps> = ({
  area,
  areas,
  projects,
  tasks,
  allTags,
  onAddProject,
  onEditArea,
  onDeleteArea,
  onEditProject,
  onDeleteProject,
}) => {
  const { t } = useTranslation();
  const areaCol = getAreaColor(area.name, areas);
  const areaIconName = getAreaIcon(area.name, areas);
  const areaProjects = projects.filter(
    (p) => (p.areaName || '').toLowerCase() === area.name.toLowerCase()
  );
  const areaMetrics = calculateAreaMetrics(area.name, tasks, projects, areas, allTags);

  return (
    <Paper withBorder radius="md" p="md">
      {/* Area Header */}
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" align="center">
          <ThemeIcon color={areaCol} variant="light" size="lg" radius="md">
            {renderIconByName(areaIconName, 20)}
          </ThemeIcon>
          <div>
            <Group gap="xs" align="center">
              <Text fw={700} size="md">
                {area.name}
              </Text>
              <Badge size="xs" color={areaCol} variant="light">
                {t('areas.badgeArea', 'Area')}
              </Badge>
              <Badge size="xs" variant="outline" color="gray">
                {areaMetrics.totalTasks} {t('common.tasks', 'tasks')}
              </Badge>
            </Group>
            {area.description && (
              <Text size="xs" c="dimmed" mt={2}>
                {area.description}
              </Text>
            )}
            {area.defaultTags && area.defaultTags.length > 0 && (
              <Group gap={4} mt={4}>
                <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconTag size={11} /> {t('areas.inheritedTags', 'Inherited tags')}:
                </Text>
                {area.defaultTags.map((tg) => (
                  <Badge key={tg} size="xs" variant="dot" color={areaCol}>
                    #{tg}
                  </Badge>
                ))}
              </Group>
            )}
          </div>
        </Group>

        <Group gap={4}>
          <Tooltip label={t('areas.addProjectToArea', 'Add project to {{area}}', { area: area.name })} withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label={t('areas.addProjectToArea', 'Add project to {{area}}', { area: area.name })}
              onClick={() => onAddProject(area.name)}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('common.edit', 'Edit')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t('areas.editAreaAria', { name: area.name })}
              onClick={() => onEditArea(area)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('common.delete', 'Delete')} withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label={t('areas.deleteAreaAria', { name: area.name })}
              onClick={() => onDeleteArea(area)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Projects inside this Area */}
      {areaProjects.length > 0 && (
        <Stack gap="xs" mt="md" pl={36}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
            {t('areas.projectsInArea', 'Projects in this Area ({{count}})', { count: areaProjects.length })}
          </Text>
          {areaProjects.map((proj) => (
            <ProjectCard
              key={proj.id || proj.name}
              project={proj}
              areaName={area.name}
              areas={areas}
              projects={projects}
              tasks={tasks}
              allTags={allTags}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
};
