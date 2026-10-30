import type { SettingsSectionId } from '../types';

export interface SettingsSectionGroup {
  /** i18n key of the group heading; null for an ungrouped entry. */
  labelKey: string | null;
  sections: SettingsSectionId[];
}

export const SETTINGS_SECTION_GROUPS: SettingsSectionGroup[] = [
  { labelKey: 'settings.groupPreferences', sections: ['general', 'editor', 'appearance'] },
  { labelKey: 'settings.groupWorkspace', sections: ['areas', 'kanban', 'tags', 'routines'] },
  { labelKey: null, sections: ['about'] },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'general';

const SECTION_IDS: SettingsSectionId[] = SETTINGS_SECTION_GROUPS.flatMap((group) => group.sections);

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return typeof value === 'string' && (SECTION_IDS as string[]).includes(value);
}

/** Maps any externally supplied section name (menu event, old links) to a valid section. */
export function normalizeSettingsSection(value: unknown): SettingsSectionId {
  return isSettingsSectionId(value) ? value : DEFAULT_SETTINGS_SECTION;
}
