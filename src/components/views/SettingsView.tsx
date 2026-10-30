import React from 'react';
import { Button, Kbd, ScrollArea, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import type { AppViewMode } from '../../types';
import { isReportView } from '../../utils/reportPeriod';
import { normalizeSettingsSection } from '../../utils/settingsSections';
import { SettingsNav } from './settings/SettingsNav';
import { SETTINGS_SECTION_META } from './settings/settingsSectionMeta';
import { useEscapeToLeave } from './settings/useEscapeToLeave';
import classes from './SettingsView.module.css';

function getViewLabelKey(view: AppViewMode): string {
  if (isReportView(view)) return 'nav.reports';
  if (view === 'tasks' || view === 'task') return 'nav.tasks';
  return 'nav.daily';
}

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { settingsActiveTab, settingsReturnView, setSettingsActiveTab, closeSettings } = useAppStoreSelector(
    (state) => ({
      settingsActiveTab: state.settingsActiveTab,
      settingsReturnView: state.settingsReturnView,
      setSettingsActiveTab: state.setSettingsActiveTab,
      closeSettings: state.closeSettings,
    })
  );

  const leave = () => {
    void closeSettings();
  };
  useEscapeToLeave(leave);

  const activeSection = normalizeSettingsSection(settingsActiveTab);
  const { Component: ActiveSection } = SETTINGS_SECTION_META[activeSection];
  const backLabel = t('settings.backTo', { view: t(getViewLabelKey(settingsReturnView)) });

  return (
    <div className={classes.root} data-testid="settings-view">
      <div className={classes.topBar}>
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={leave}
        >
          {backLabel}
        </Button>
        <Title order={1} size="h3" className={classes.title}>
          {t('settings.title')}
        </Title>
        <Text size="xs" c="dimmed" className={classes.escapeHint}>
          <Kbd size="xs">Esc</Kbd>
        </Text>
      </div>

      <div className={classes.body}>
        <SettingsNav active={activeSection} onSelect={setSettingsActiveTab} />
        <ScrollArea className={classes.content} type="auto" scrollbars="y">
          <div className={classes.contentInner}>
            <ActiveSection />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
