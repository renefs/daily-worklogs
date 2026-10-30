import React from 'react';
import { Box, Text, Title } from '@mantine/core';
import { IconCloudCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './SettingsSection.module.css';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  /** Primary actions of the section, aligned to the right of the title. */
  actions?: React.ReactNode;
  /** Search or filter control shown under the title. */
  search?: React.ReactNode;
  /** 'vault' adds the standard note that this section follows the vault across computers. */
  scope?: 'vault';
  /** Custom scope note, used when the standard one does not fit. */
  hint?: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  actions,
  search,
  scope,
  hint,
  children,
}) => {
  const { t } = useTranslation();
  const hintText = hint ?? (scope === 'vault' ? t('settings.scopeVault') : undefined);

  return (
    <section className={classes.root} aria-labelledby="settings-section-title">
      <div className={classes.header}>
        <Box className={classes.heading}>
          <Title order={2} size="h3" id="settings-section-title" className={classes.title}>
            {title}
          </Title>
          {description && (
            <Text size="sm" c="dimmed" mt={2}>
              {description}
            </Text>
          )}
        </Box>
        {actions && <div className={classes.actions}>{actions}</div>}
      </div>
      {search}
      {hintText && (
        <Text size="xs" className={classes.hint}>
          <IconCloudCheck size={14} className={classes.hintIcon} aria-hidden />
          <span>{hintText}</span>
        </Text>
      )}
      {children}
    </section>
  );
};
