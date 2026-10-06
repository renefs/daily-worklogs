import React, { useState, useEffect, useTransition } from 'react';
import {
  Badge,
  Group,
  Highlight,
  Stack,
  Text,
} from '@mantine/core';
import {
  Spotlight,
  spotlight,
} from '@mantine/spotlight';
import {
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconFileText,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAppStoreSelector } from '../../store/useAppStore';
import type { VaultSearchResult } from '../../types';

export const AppSpotlight: React.FC = () => {
  const { t } = useTranslation();
  const [, startTransition] = useTransition();

  const {
    setSelectedDate,
    setCurrentView,
    openReports,
    openTaskModal,
    setIsSettingsOpen,
  } = useAppStoreSelector((state) => ({
    setSelectedDate: state.setSelectedDate,
    setCurrentView: state.setCurrentView,
    openReports: state.openReports,
    openTaskModal: state.openTaskModal,
    setIsSettingsOpen: state.setIsSettingsOpen,
  }));

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const cleanQuery = query
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();

  useEffect(() => {
    if (!cleanQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      if (window.electronAPI?.searchVault) {
        try {
          const results = await window.electronAPI.searchVault(cleanQuery);
          startTransition(() => {
            setSearchResults(results || []);
            setIsSearching(false);
          });
        } catch (err) {
          console.error('Spotlight search error:', err);
          setIsSearching(false);
        }
      } else {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [cleanQuery]);

  const handleSelectDate = async (date: string) => {
    spotlight.close();
    await setSelectedDate(date);
    await setCurrentView('daily');
  };

  const handleSelectTask = async (filename: string) => {
    spotlight.close();
    await openTaskModal({ filename } as any);
  };

  const handleCommand = async (action: () => void | Promise<void>) => {
    spotlight.close();
    await action();
  };

  const noteResults = searchResults.filter((r) => r.type === 'note');
  const taskResults = searchResults.filter((r) => r.type === 'task');

  return (
    <Spotlight.Root
      shortcut={['mod + k', 'mod + p']}
      query={query}
      onQueryChange={setQuery}
      radius="md"
      maxHeight={480}
    >
      <Spotlight.Search
        placeholder={t('spotlight.searchPlaceholder', 'Type a command, date, or search vault...')}
        leftSection={<IconSearch size={18} stroke={1.5} />}
      />
      <Spotlight.ActionsList>
        {/* Navigation Commands */}
        {!query.trim() && (
          <Spotlight.ActionsGroup label={t('spotlight.quickActions', 'Quick Actions')}>
            <Spotlight.Action
              onClick={() => handleCommand(() => handleSelectDate(dayjs().format('YYYY-MM-DD')))}
              leftSection={<IconCalendar size={18} />}
            >
              <Group justify="space-between">
                <Text size="sm">{t('nav.openToday', "Open Today's Note")}</Text>
                <Badge size="xs" variant="light" color="indigo">{dayjs().format('YYYY-MM-DD')}</Badge>
              </Group>
            </Spotlight.Action>

            <Spotlight.Action
              onClick={() => handleCommand(() => openReports())}
              leftSection={<IconChartBar size={18} />}
            >
              <Text size="sm">{t('nav.reports', 'Reports & Metrics')}</Text>
            </Spotlight.Action>

            <Spotlight.Action
              onClick={() => handleCommand(() => setCurrentView('tasks'))}
              leftSection={<IconChecklist size={18} />}
            >
              <Text size="sm">{t('nav.tasks', 'Task Board')}</Text>
            </Spotlight.Action>

            <Spotlight.Action
              onClick={() => handleCommand(() => openTaskModal())}
              leftSection={<IconPlus size={18} />}
            >
              <Text size="sm">{t('tasks.newTask', 'New Task')}</Text>
            </Spotlight.Action>

            <Spotlight.Action
              onClick={() => handleCommand(() => setIsSettingsOpen(true))}
              leftSection={<IconSettings size={18} />}
            >
              <Text size="sm">{t('settings.title', 'Preferences & Settings')}</Text>
            </Spotlight.Action>
          </Spotlight.ActionsGroup>
        )}

        {/* Note Search Results */}
        {noteResults.length > 0 && (
          <Spotlight.ActionsGroup label={t('nav.notes', 'Daily Notes')}>
            {noteResults.map((result) => (
              <Spotlight.Action
                key={`note-${result.id}`}
                onClick={() => handleSelectDate(result.id)}
                leftSection={<IconFileText size={18} />}
              >
                <Stack gap={2}>
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={600}>{result.id}</Text>
                    {result.line && (
                      <Badge size="xs" variant="outline" color="gray">
                        Line {result.line}
                      </Badge>
                    )}
                  </Group>
                  {result.snippet && (
                    <Highlight
                      highlight={cleanQuery.split(/\s+/)}
                      size="xs"
                      c="dimmed"
                      lineClamp={1}
                    >
                      {result.snippet}
                    </Highlight>
                  )}
                </Stack>
              </Spotlight.Action>
            ))}
          </Spotlight.ActionsGroup>
        )}

        {/* Task Search Results */}
        {taskResults.length > 0 && (
          <Spotlight.ActionsGroup label={t('tasks.title', 'Tasks')}>
            {taskResults.map((result) => (
              <Spotlight.Action
                key={`task-${result.id}`}
                onClick={() => handleSelectTask(result.id)}
                leftSection={<IconChecklist size={18} />}
              >
                <Stack gap={2}>
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={600} lineClamp={1}>{result.title}</Text>
                    {result.status && (
                      <Badge size="xs" variant="light" color="blue">
                        {result.status}
                      </Badge>
                    )}
                  </Group>
                  {result.snippet && (
                    <Highlight
                      highlight={cleanQuery.split(/\s+/)}
                      size="xs"
                      c="dimmed"
                      lineClamp={1}
                    >
                      {result.snippet}
                    </Highlight>
                  )}
                </Stack>
              </Spotlight.Action>
            ))}
          </Spotlight.ActionsGroup>
        )}

        {query.trim() && !isSearching && searchResults.length === 0 && (
          <Spotlight.Empty>
            {t('spotlight.nothingFound', 'No notes or tasks matching "{{query}}"', { query })}
          </Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
};
