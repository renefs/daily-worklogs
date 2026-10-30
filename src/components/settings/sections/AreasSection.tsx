import React, { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Badge,
  Paper,
  Modal,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconFolders,
  IconFolder,
  IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { AreaDefinition, ProjectDefinition } from '../../../types';
import { AreaEditorModal } from '../areas/AreaEditorModal';
import { ProjectEditorModal } from '../areas/ProjectEditorModal';
import { AreaCard } from '../areas/AreaCard';
import { ProjectCard } from '../areas/ProjectCard';
import { filterAreas, findOrphanedProjects } from '../areas/areaSearch';
import { SettingsSection } from '../SettingsSection';
import classes from './AreasSection.module.css';

type DeleteTarget =
  | { type: 'area'; item: AreaDefinition }
  | { type: 'project'; item: ProjectDefinition };

export const AreasSection: React.FC = () => {
  const { t } = useTranslation();

  const {
    areas,
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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const query = search.trim();
  const filteredAreas = filterAreas(areas, projects, query);
  // Orphans are independent from the area list: they must stay visible even when no area matches.
  const orphanedProjects = findOrphanedProjects(areas, projects, query);
  const hasNothingToShow = filteredAreas.length === 0 && orphanedProjects.length === 0;

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
      await deleteArea(deleteTarget.item.name);
      notifications.show({
        title: t('areas.areaDeleted', 'Area removed'),
        message: deleteTarget.item.name,
        color: 'red',
      });
    } else {
      await deleteProject(deleteTarget.item.name);
      notifications.show({
        title: t('areas.projectDeleted', 'Project removed'),
        message: deleteTarget.item.name,
        color: 'red',
      });
    }
    setDeleteTarget(null);
  };

  const searchField = (
    <TextInput
      aria-label={t('areas.searchPlaceholder')}
      placeholder={t('areas.searchPlaceholder')}
      leftSection={<IconSearch size={15} />}
      value={search}
      onChange={(e) => setSearch(e.currentTarget.value)}
      size="sm"
      className={classes.searchInput}
    />
  );

  const actions = (
    <>
      <Tooltip label={t('areas.createAreaFirst')} disabled={areas.length > 0} withArrow>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          size="sm"
          disabled={areas.length === 0}
          onClick={() => handleOpenAddProject()}
        >
          {t('areas.newProject')}
        </Button>
      </Tooltip>

      <Button leftSection={<IconPlus size={16} />} variant="filled" size="sm" onClick={handleOpenAddArea}>
        {t('areas.newArea')}
      </Button>
    </>
  );

  return (
    <SettingsSection
      title={t('areas.title')}
      description={t('areas.subtitle')}
      actions={actions}
      search={searchField}
      scope="vault"
    >
      {/* Areas & Projects List */}
      {hasNothingToShow ? (
        <Paper p="xl" withBorder radius="md" className={classes.emptyState}>
          <IconFolders size={36} color="gray" className={classes.emptyIcon} />
          <Text size="sm" c="dimmed">
            {query ? t('areas.noSearchResults') : t('areas.noAreasFound', 'No areas found')}
          </Text>
          {query ? (
            <Button mt="md" size="xs" variant="light" onClick={() => setSearch('')}>
              {t('areas.clearSearch')}
            </Button>
          ) : (
            <Button mt="md" size="xs" variant="light" onClick={handleOpenAddArea}>
              {t('areas.createFirstArea', 'Create Area')}
            </Button>
          )}
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredAreas.map((area) => (
            <AreaCard
              key={area.id || area.name}
              area={area}
              areas={areas}
              projects={projects}
              tasks={tasks}
              allTags={allTags}
              onAddProject={handleOpenAddProject}
              onEditArea={handleOpenEditArea}
              onDeleteArea={(a) => setDeleteTarget({ type: 'area', item: a })}
              onEditProject={handleOpenEditProject}
              onDeleteProject={(p) => setDeleteTarget({ type: 'project', item: p })}
            />
          ))}

          {/* Orphaned / Unassigned Projects */}
          {orphanedProjects.length > 0 && (
            <Paper withBorder radius="md" p="md" className={classes.orphansPanel}>
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
                {orphanedProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id || proj.name}
                    project={proj}
                    areaName={proj.areaName || 'None'}
                    areas={areas}
                    projects={projects}
                    tasks={tasks}
                    allTags={allTags}
                    onEdit={handleOpenEditProject}
                    onDelete={(p) => setDeleteTarget({ type: 'project', item: p })}
                  />
                ))}
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
    </SettingsSection>
  );
};
