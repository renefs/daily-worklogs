import React, { useEffect, useState } from 'react';
import { Badge, Loader, Text } from '@mantine/core';
import { Spotlight } from '@mantine/spotlight';
import {
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS } from '../../types';
import { appSpotlightStore, selectFirstSpotlightAction } from './appSpotlightStore';
import { NoteResultAction, SpotlightRow, TaskResultAction } from './SpotlightResultActions';
import { normalizeSearchQuery } from '../../shared/searchQuery';
import { useVaultSearch } from './useVaultSearch';
import classes from './AppSpotlight.module.css';

interface SpotlightCommand {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  run: () => void | Promise<void>;
}

export const AppSpotlight: React.FC = () => {
  const { t } = useTranslation();
  const {
    setSelectedDate,
    setCurrentView,
    openReports,
    openTaskModal,
    openSettings,
    kanbanColumns,
  } = useAppStoreSelector((state) => ({
    setSelectedDate: state.setSelectedDate,
    setCurrentView: state.setCurrentView,
    openReports: state.openReports,
    openTaskModal: state.openTaskModal,
    openSettings: state.openSettings,
    kanbanColumns: state.settings?.kanbanColumns,
  }));

  const [query, setQuery] = useState('');
  const cleanQuery = normalizeSearchQuery(query);
  const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const { results, isSearching } = useVaultSearch(cleanQuery);
  const columns = kanbanColumns && kanbanColumns.length > 0 ? kanbanColumns : DEFAULT_KANBAN_COLUMNS;

  const openDate = async (date: string) => {
    await setSelectedDate(date);
    await setCurrentView('daily');
  };

  const today = dayjs().format('YYYY-MM-DD');
  const commands: SpotlightCommand[] = [
    { id: 'today', label: t('nav.openToday'), icon: <IconCalendar size={18} />, badge: today, run: () => openDate(today) },
    { id: 'reports', label: t('nav.reports'), icon: <IconChartBar size={18} />, run: () => openReports() },
    { id: 'tasks', label: t('tasks.title'), icon: <IconChecklist size={18} />, run: () => setCurrentView('tasks') },
    { id: 'new-task', label: t('tasks.newTask'), icon: <IconPlus size={18} />, run: () => openTaskModal() },
    { id: 'settings', label: t('settings.title'), icon: <IconSettings size={18} />, run: () => openSettings() },
  ];
  const visibleCommands = commands.filter((command) => {
    const label = command.label.toLowerCase();
    return queryWords.every((word) => label.includes(word));
  });

  const noteResults = results.filter((r) => r.type === 'note');
  const taskResults = results.filter((r) => r.type === 'task');
  const hasAnyAction = visibleCommands.length > 0 || results.length > 0;

  // Results arrive after Spotlight already selected the first action of the previous list,
  // so the selection is moved to the first row of the new list to keep Enter and arrows working.
  useEffect(() => {
    if (cleanQuery) selectFirstSpotlightAction();
  }, [results, cleanQuery]);

  return (
    <Spotlight.Root
      store={appSpotlightStore}
      shortcut={['mod + k', 'mod + p']}
      query={query}
      onQueryChange={setQuery}
      radius="md"
      size="lg"
      scrollable
      maxHeight={520}
    >
      <Spotlight.Search
        placeholder={t('spotlight.searchPlaceholder')}
        leftSection={<IconSearch size={18} stroke={1.5} />}
        rightSection={isSearching ? <Loader size="xs" /> : null}
        aria-label={t('spotlight.searchVault')}
      />
      <Spotlight.ActionsList>
        {visibleCommands.length > 0 && (
          <Spotlight.ActionsGroup label={t('spotlight.quickActions')}>
            {visibleCommands.map((command) => (
              <SpotlightRow key={command.id} icon={command.icon} onSelect={() => void command.run()}>
                <div className={classes.resultHeader}>
                  <Text size="sm" className={classes.resultTitle}>{command.label}</Text>
                  {command.badge && (
                    <Badge size="xs" variant="default" className={classes.badge}>{command.badge}</Badge>
                  )}
                </div>
              </SpotlightRow>
            ))}
          </Spotlight.ActionsGroup>
        )}

        {noteResults.length > 0 && (
          <Spotlight.ActionsGroup label={t('spotlight.notesGroup', { count: noteResults.length })}>
            {noteResults.map((result) => (
              <NoteResultAction key={`note-${result.id}`} result={result} highlight={queryWords} onSelect={(date) => void openDate(date)} />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {taskResults.length > 0 && (
          <Spotlight.ActionsGroup label={t('spotlight.tasksGroup', { count: taskResults.length })}>
            {taskResults.map((result) => (
              <TaskResultAction
                key={`task-${result.id}`}
                result={result}
                highlight={queryWords}
                columns={columns}
                onSelect={(filename) => void openTaskModal({ filename })}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {cleanQuery && !isSearching && !hasAnyAction && (
          <Spotlight.Empty>{t('spotlight.nothingFound', { query: cleanQuery })}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
};
