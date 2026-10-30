import React from 'react';
import {
  IconChecklist,
  IconFolder,
  IconInfoCircle,
  IconLayoutKanban,
  IconPalette,
  IconPencil,
  IconSettings,
  IconTag,
} from '@tabler/icons-react';
import type { SettingsSectionId } from '../../../types';
import { AboutSection } from '../../settings/sections/AboutSection';
import { AppearanceSection } from '../../settings/sections/AppearanceSection';
import { AreasSection } from '../../settings/sections/AreasSection';
import { EditorSection } from '../../settings/sections/EditorSection';
import { GeneralSection } from '../../settings/sections/GeneralSection';
import { RoutinesSection } from '../../settings/sections/RoutinesSection';
import { TagsSection } from '../../settings/sections/TagsSection';
import { TaskBoardSection } from '../../settings/sections/TaskBoardSection';

export interface SettingsSectionMeta {
  labelKey: string;
  icon: React.ReactNode;
  Component: React.FC;
}

export const SETTINGS_SECTION_META: Record<SettingsSectionId, SettingsSectionMeta> = {
  general: { labelKey: 'settings.general', icon: <IconSettings size={16} />, Component: GeneralSection },
  editor: { labelKey: 'settings.editor', icon: <IconPencil size={16} />, Component: EditorSection },
  appearance: { labelKey: 'settings.appearance', icon: <IconPalette size={16} />, Component: AppearanceSection },
  areas: { labelKey: 'settings.tabAreasProjects', icon: <IconFolder size={16} />, Component: AreasSection },
  kanban: { labelKey: 'settings.taskBoard', icon: <IconLayoutKanban size={16} />, Component: TaskBoardSection },
  tags: { labelKey: 'settings.tabTags', icon: <IconTag size={16} />, Component: TagsSection },
  routines: { labelKey: 'settings.tabRoutines', icon: <IconChecklist size={16} />, Component: RoutinesSection },
  about: { labelKey: 'settings.about', icon: <IconInfoCircle size={16} />, Component: AboutSection },
};
