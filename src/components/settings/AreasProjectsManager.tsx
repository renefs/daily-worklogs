import React, { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Badge,
  Paper,
  ActionIcon,
  Tooltip,
  Modal,
  ThemeIcon,
  Progress,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconFolders,
  IconFolder,
  IconCheck,
  IconTarget,
  IconCalendar,
  IconTag,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAppStoreSelector } from '../../store/useAppStore';
import { AreaDefinition, ProjectDefinition } from '../../types';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getAreaIcon,
  getProjectColor,
  calculateProjectProgress,
  calculateAreaMetrics,
} from '../../utils/areaProjectUtils';
import { AreaEditorModal, renderIconByName } from './areas/AreaEditorModal';
import { ProjectEditorModal } from './areas/ProjectEditorModal';

export const AreasProjectsManager: React.FC = () => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    areas = DEFAULT_AREAS,
    projects = [],
    tasks,
    allTags,
    saveArea,
    deleteArea,
    saveProject,
    deleteProject,
  } = useAppStoreSelector((state) => ({
    areas: state.areas,
    projects: state.projects,
    tasks: state.tasks,
    allTags: state.allTags,
    saveArea: state.saveArea,
    deleteArea: state.deleteArea,
    saveProject: state.saveProject,
    deleteProject: state.deleteProject,
  }));

  const [search, setSearch] = useState('');

  // Area modal state
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaDefinition | null>(null);

  // Project modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDefinition | null>(null);
  const [projectDefaultArea, setProjectDefaultArea] = useState<string | undefined>(undefined);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'area' | 'project'; item: any } | null>(null);

  // Filtered areas
  const filteredAreas = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return areas;
    return areas.filter((a) => {
      const matchArea =
        a.name.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q));
      const matchChildProjects = projects.some(
        (p) =>
          p.areaName.toLowerCase() === a.name.toLowerCase() &&
          (p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
      );
      return matchArea || matchChildProjects;
    });
  }, [areas, projects, search]);

  // Projects whose parent area doesn't match any known area
  const orphanedProjects = useMemo(() => {
    const areaNames = new Set(areas.map((a) => a.name.toLowerCase()));
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const isOrphan = !areaNames.has((p.areaName || '').toLowerCase());
      if (!isOrphan) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.areaName && p.areaName.toLowerCase().includes(q))
      );
    });
  }, [areas, projects, search]);

  const handleOpenAddArea = () => {
    setEditingArea(null);
    setIsAreaModalOpen(true);
  };

  const handleOpenEditArea = (area: AreaDefinition) => {
    setEditingArea(area);
    setIsAreaModalOpen(true);
  };

  const handleSaveArea = async (areaData: AreaDefinition, oldName?: string) => {
    await saveArea(areaData, oldName);
    setIsAreaModalOpen(false);
    notifications.show({
      title: t('areas.areaSaved', 'Area saved successfully'),
      message: areaData.name,
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const handleOpenAddProject = (defaultAreaName?: string) => {
    setEditingProject(null);
    setProjectDefaultArea(defaultAreaName || areas[0]?.name || 'General');
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: ProjectDefinition) => {
    setEditingProject(proj);
    setProjectDefaultArea(undefined);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (
    projData: ProjectDefinition,
    oldName?: string,
    oldAreaName?: string
  ) => {
    await saveProject(projData, oldName, oldAreaName);
    setIsProjectModalOpen(false);
    notifications.show({
      title: t('areas.projectSaved', 'Project saved successfully'),
      message: projData.name,
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'area') {
      await deleteArea(deleteTarget.item.id || deleteTarget.item.name);
      notifications.show({
        title: t('areas.areaDeleted', 'Area removed'),
        message: deleteTarget.item.name,
        color: 'red',
      });
    } else {
      await deleteProject(deleteTarget.item.id || deleteTarget.item.name);
      notifications.show({
        title: t('areas.projectDeleted', 'Project removed'),
        message: deleteTarget.item.name,
        color: 'red',
      });
    }
    setDeleteTarget(null);
  };

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <Group justify="space-between" wrap="wrap">
        <TextInput
          placeholder={t('areas.searchPlaceholder', 'Search areas, projects, or tags...')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size="sm"
          style={{ width: 280 }}
        />

        <Group gap="xs">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            color="indigo"
            size="sm"
            onClick={() => handleOpenAddProject()}
          >
            {t('areas.newProject', 'New Project')}
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            variant="filled"
            color="indigo"
            size="sm"
            onClick={handleOpenAddArea}
          >
            {t('areas.newArea', 'New Area')}
          </Button>
        </Group>
      </Group>

      {/* Areas & Projects List */}
      {filteredAreas.length === 0 ? (
        <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center' }}>
          <IconFolders size={36} color="gray" style={{ opacity: 0.5, margin: '0 auto 8px' }} />
          <Text size="sm" c="dimmed">
            {t('areas.noAreasFound', 'No areas found')}
          </Text>
          <Button mt="md" size="xs" variant="light" color="indigo" onClick={handleOpenAddArea}>
            {t('areas.createFirstArea', 'Create Area')}
          </Button>
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredAreas.map((area) => {
            const areaCol = getAreaColor(area.name, areas);
            const areaIconName = getAreaIcon(area.name, areas);
            const areaProjects = projects.filter(
              (p) => (p.areaName || '').toLowerCase() === area.name.toLowerCase()
            );
            const areaMetrics = calculateAreaMetrics(area.name, tasks, projects, areas, allTags);

            return (
              <Paper key={area.id || area.name} withBorder radius="md" p="md">
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
                        color="indigo"
                        size="sm"
                        onClick={() => handleOpenAddProject(area.name)}
                      >
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('common.edit', 'Edit')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => handleOpenEditArea(area)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('common.delete', 'Delete')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => setDeleteTarget({ type: 'area', item: area })}
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
                    {areaProjects.map((proj) => {
                      const projCol = getProjectColor(proj.name, area.name, projects, areas);
                      const metrics = calculateProjectProgress(proj.name, area.name, tasks, areas, projects, allTags);

                      return (
                        <Paper
                          key={proj.id || proj.name}
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
                                  {proj.name}
                                </Text>
                                {proj.status && (
                                  <Badge
                                    size="xs"
                                    color={
                                      proj.status === 'completed'
                                        ? 'teal'
                                        : proj.status === 'on_hold'
                                        ? 'yellow'
                                        : proj.status === 'archived'
                                        ? 'gray'
                                        : 'blue'
                                    }
                                    variant="light"
                                  >
                                    {proj.status}
                                  </Badge>
                                )}
                                {proj.targetDate && (
                                  <Badge
                                    size="xs"
                                    color={proj.targetDate < dayjs().format('YYYY-MM-DD') ? 'red' : 'gray'}
                                    variant="outline"
                                    leftSection={<IconCalendar size={10} />}
                                  >
                                    {dayjs(proj.targetDate).format('MMM D, YYYY')}
                                  </Badge>
                                )}
                              </Group>

                              {proj.description && (
                                <Text size="xs" c="dimmed" mt={2} lineClamp={1}>
                                  {proj.description}
                                </Text>
                              )}

                              {/* Progress bar for Project */}
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
                                  size="sm"
                                  onClick={() => handleOpenEditProject(proj)}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t('common.delete', 'Delete')} withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() => setDeleteTarget({ type: 'project', item: proj })}
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

                {/* Direct tasks inside this area notification */}
                {areaProjects.length === 0 && (
                  <Text size="xs" c="dimmed" mt="xs" pl={36} fs="italic">
                    {t('areas.noProjectsYet', 'No projects defined yet in this Area. Operational tasks can be added directly.')}
                  </Text>
                )}
              </Paper>
            );
          })}

          {/* Orphaned / Unassigned Projects (e.g. from previously renamed or deleted areas) */}
          {orphanedProjects.length > 0 && (
            <Paper withBorder radius="md" p="md" style={{ borderColor: 'var(--mantine-color-orange-5)' }}>
              <Group justify="space-between" align="center" mb="sm">
                <Group gap="xs">
                  <ThemeIcon color="orange" variant="light" size="md" radius="md">
                    <IconFolder size={18} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="sm">
                      {t('areas.unassignedProjects', 'Other Projects / Unassigned')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('areas.unassignedProjectsDesc', 'Projects whose parent area was changed or removed. You can edit them to assign an active Area.')}
                    </Text>
                  </div>
                </Group>
                <Badge color="orange" variant="light" size="sm">
                  {orphanedProjects.length} {t('areas.projectsLabel', 'Projects')}
                </Badge>
              </Group>

              <Stack gap="xs">
                {orphanedProjects.map((proj) => {
                  const projCol = proj.color || 'orange';
                  const metrics = calculateProjectProgress(proj.name, proj.areaName, tasks, areas, projects);

                  return (
                    <Paper
                      key={proj.id || proj.name}
                      p="xs"
                      radius="md"
                      withBorder
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 146, 43, 0.08)' : 'rgba(255, 146, 43, 0.05)',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" align="center" wrap="wrap">
                            <Text fw={600} size="sm">
                              {proj.name}
                            </Text>
                            <Badge size="xs" color="gray" variant="outline">
                              {t('areas.parentArea', 'Area')}: {proj.areaName || 'None'}
                            </Badge>
                          </Group>
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
                              color="indigo"
                              size="sm"
                              onClick={() => handleOpenEditProject(proj)}
                            >
                              <IconEdit size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t('common.delete', 'Delete')} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => setDeleteTarget({ type: 'project', item: proj })}
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
            </Paper>
          )}
        </Stack>
      )}

      {/* Area Create / Edit Modal */}
      <AreaEditorModal
        opened={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        editingArea={editingArea}
        onSave={handleSaveArea}
      />

      {/* Project Create / Edit Modal */}
      <ProjectEditorModal
        opened={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        editingProject={editingProject}
        defaultAreaName={projectDefaultArea}
        areas={areas}
        projects={projects}
        onSave={handleSaveProject}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={<Text fw={700}>{t('common.confirmDelete', 'Confirm Deletion')}</Text>}
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            {deleteTarget?.type === 'area'
              ? t('areas.deleteAreaConfirm', 'Are you sure you want to delete the Area "{{name}}"? Projects and tasks will remain in the vault.', { name: deleteTarget?.item?.name })
              : t('areas.deleteProjectConfirm', 'Are you sure you want to delete the Project "{{name}}"? Associated tasks will remain in the vault.', { name: deleteTarget?.item?.name })}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              {t('common.delete', 'Delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
