import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  SimpleGrid,
  Group,
  Text,
  Button,
  ThemeIcon,
  Tooltip,
  ColorSwatch,
  CheckIcon,
  TagsInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconTarget, IconCalendar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { AreaDefinition, ProjectDefinition, ProjectStatus } from '../../../types';
import {
  AREA_COLOR_PALETTE,
  getAreaColor,
  getProjectColor,
} from '../../../utils/areaProjectUtils';

export interface ProjectEditorModalProps {
  opened: boolean;
  onClose: () => void;
  editingProject: ProjectDefinition | null;
  defaultAreaName?: string;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  onSave: (
    project: ProjectDefinition,
    oldName?: string,
    oldAreaName?: string
  ) => Promise<void> | void;
}

export const ProjectEditorModal: React.FC<ProjectEditorModalProps> = ({
  opened,
  onClose,
  editingProject,
  defaultAreaName,
  areas,
  projects,
  onSave,
}) => {
  const { t } = useTranslation();

  const [projectName, setProjectName] = useState('');
  const [projectAreaName, setProjectAreaName] = useState('');
  const [projectColor, setProjectColor] = useState('teal');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTargetDate, setProjectTargetDate] = useState<Date | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('active');
  const [projectTags, setProjectTags] = useState<string[]>([]);

  useEffect(() => {
    if (opened) {
      if (editingProject) {
        setProjectName(editingProject.name);
        setProjectAreaName(editingProject.areaName);
        setProjectColor(
          editingProject.color ||
            getProjectColor(editingProject.name, editingProject.areaName, projects, areas)
        );
        setProjectDescription(editingProject.description || '');
        setProjectTargetDate(
          editingProject.targetDate ? dayjs(editingProject.targetDate).toDate() : null
        );
        setProjectStatus(editingProject.status || 'active');
        setProjectTags(editingProject.tags || []);
      } else {
        const initialArea = defaultAreaName || areas[0]?.name || 'General';
        setProjectName('');
        setProjectAreaName(initialArea);
        setProjectColor(initialArea ? getAreaColor(initialArea, areas) : 'teal');
        setProjectDescription('');
        setProjectTargetDate(null);
        setProjectStatus('active');
        setProjectTags([]);
      }
    }
  }, [opened, editingProject, defaultAreaName, areas, projects]);

  const handleSave = async () => {
    const cleanName = projectName.trim();
    if (!cleanName || !projectAreaName) return;

    await onSave(
      {
        id: editingProject?.id || cleanName.toLowerCase().replace(/\s+/g, '-'),
        name: cleanName,
        areaName: projectAreaName,
        color: projectColor,
        description: projectDescription.trim() || undefined,
        targetDate: projectTargetDate
          ? dayjs(projectTargetDate).format('YYYY-MM-DD')
          : undefined,
        status: projectStatus,
        tags: projectTags,
      },
      editingProject?.name,
      editingProject?.areaName
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color={projectColor} variant="light" size="md" radius="md">
            <IconTarget size={18} />
          </ThemeIcon>
          <Text fw={700}>
            {editingProject
              ? t('areas.editProjectTitle', 'Edit Project')
              : t('areas.createProjectTitle', 'Create Finite Project')}
          </Text>
        </Group>
      }
      size="md"
      radius="md"
    >
      <Stack gap="md">
        <TextInput
          label={t('areas.projectName', 'Project Name')}
          placeholder="e.g. Migración Wowza, Renovación Sala 1..."
          required
          value={projectName}
          onChange={(e) => setProjectName(e.currentTarget.value)}
          data-autofocus
        />

        <Select
          label={t('areas.parentArea', 'Parent Area')}
          description={t(
            'areas.parentAreaHelp',
            'The continuous service / area this project belongs to'
          )}
          required
          value={projectAreaName}
          onChange={(val) => {
            if (val) {
              setProjectAreaName(val);
              setProjectColor(getAreaColor(val, areas));
            }
          }}
          data={areas.map((a) => ({
            value: a.name,
            label: a.name,
          }))}
        />

        <SimpleGrid cols={2} spacing="md">
          <Select
            label={t('areas.status', 'Project Status')}
            value={projectStatus}
            onChange={(val) => setProjectStatus((val as ProjectStatus) || 'active')}
            data={[
              { value: 'active', label: t('areas.statusActive', 'Active') },
              { value: 'on_hold', label: t('areas.statusOnHold', 'On Hold') },
              { value: 'completed', label: t('areas.statusCompleted', 'Completed') },
              { value: 'archived', label: t('areas.statusArchived', 'Archived') },
            ]}
          />

          <DatePickerInput
            label={t('areas.targetDate', 'Target / Due Date')}
            placeholder="Select target deadline"
            value={projectTargetDate}
            onChange={setProjectTargetDate}
            clearable
            leftSection={<IconCalendar size={16} />}
          />
        </SimpleGrid>

        <div>
          <Text size="sm" fw={500} mb={6}>
            {t('areas.projectColor', 'Project Color')}
          </Text>
          <Group gap="xs">
            {AREA_COLOR_PALETTE.map((c) => (
              <Tooltip key={c} label={c} withArrow>
                <ColorSwatch
                  color={`var(--mantine-color-${c}-6)`}
                  size={28}
                  radius="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setProjectColor(c)}
                >
                  {projectColor === c && <CheckIcon size={12} color="#fff" />}
                </ColorSwatch>
              </Tooltip>
            ))}
          </Group>
        </div>

        <TagsInput
          label={t('areas.projectTags', 'Project Tags')}
          placeholder="Tags specific to this project (press enter)"
          value={projectTags}
          onChange={setProjectTags}
          clearable
        />

        <TextInput
          label={t('areas.description', 'Description')}
          placeholder="Goal, deliverable or scope..."
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            color="indigo"
            onClick={handleSave}
            disabled={!projectName.trim() || !projectAreaName}
          >
            {t('common.save', 'Save Project')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
