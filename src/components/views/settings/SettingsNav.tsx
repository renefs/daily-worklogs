import React from 'react';
import { Divider, NavLink, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SettingsSectionId } from '../../../types';
import { SETTINGS_SECTION_GROUPS } from '../../../utils/settingsSections';
import { SETTINGS_SECTION_META } from './settingsSectionMeta';
import classes from './SettingsNav.module.css';

export interface SettingsNavProps {
  active: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({ active, onSelect }) => {
  const { t } = useTranslation();

  return (
    <nav className={classes.nav} aria-label={t('settings.sectionsNav')}>
      {SETTINGS_SECTION_GROUPS.map((group, index) => (
        <React.Fragment key={group.labelKey ?? 'ungrouped'}>
          {group.labelKey ? (
            <Text size="xs" fw={700} c="dimmed" className={classes.groupLabel}>
              {t(group.labelKey)}
            </Text>
          ) : (
            index > 0 && <Divider className={classes.divider} />
          )}
          {group.sections.map((section) => {
            const meta = SETTINGS_SECTION_META[section];
            const isActive = section === active;
            return (
              <NavLink
                key={section}
                component="button"
                type="button"
                label={t(meta.labelKey)}
                leftSection={meta.icon}
                active={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(section)}
              />
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
};
