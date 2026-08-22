import React, { useState, useMemo } from 'react';
import {
  Stack,
  Button,
  TextInput,
  ScrollArea,
  Text,
  Group,
  UnstyledButton,
  Badge,
  Paper,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
  IconPlus,
  IconSearch,
  IconFileText,
  IconFolder,
  IconFolderOpen,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export const AppSidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');

  const {
    selectedDate,
    setSelectedDate,
    setCurrentView,
    notesList,
    settings,
  } = useAppStore();

  const todayStr = dayjs().format('YYYY-MM-DD');

  // Set of dates that have notes
  const notesDateSet = useMemo(() => {
    return new Set(notesList.map((n) => n.date));
  }, [notesList]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notesList;
    return notesList.filter((n) => n.date.includes(search.trim()));
  }, [notesList, search]);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentView('daily');
  };

  const handleOpenToday = () => {
    setSelectedDate(todayStr);
    setCurrentView('daily');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '12px',
      }}
    >
      {/* Action Button: Create Today's Note */}
      <Button
        fullWidth
        size="sm"
        variant={selectedDate === todayStr ? 'light' : 'filled'}
        color="primary"
        leftSection={<IconPlus size={18} />}
        onClick={handleOpenToday}
        radius="md"
      >
        {t('nav.newToday')}
      </Button>

      {/* Mini Date Picker */}
      <Paper withBorder p="xs" radius="md">
        <DatePicker
          value={dayjs(selectedDate).toDate()}
          onChange={(val) => {
            if (val) handleSelectDate(dayjs(val).format('YYYY-MM-DD'));
          }}
          size="xs"
          firstDayOfWeek={settings?.weekStartDay ?? 1}
          renderDay={(date) => {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            const hasNote = notesDateSet.has(dateStr);
            const isSelected = dateStr === selectedDate;

            return (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: hasNote ? 700 : 'normal',
                }}
              >
                <span>{date.getDate()}</span>
                {hasNote && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: isSelected
                        ? '#ffffff'
                        : 'var(--mantine-primary-color-filled)',
                    }}
                  />
                )}
              </div>
            );
          }}
        />
      </Paper>

      {/* Search Filter */}
      <TextInput
        placeholder={t('nav.search')}
        size="xs"
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        radius="md"
      />

      {/* Recent Notes List */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} px={4}>
          {t('calendar.title')} ({filteredNotes.length})
        </Text>

        <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
          <Stack gap={3}>
            {filteredNotes.map((note) => {
              const isSelected = note.date === selectedDate;
              const formattedDate = dayjs(note.date)
                .locale(i18n.language === 'es' ? 'es' : 'en')
                .format('ddd, MMM D, YYYY');

              return (
                <UnstyledButton
                  key={note.date}
                  onClick={() => handleSelectDate(note.date)}
                  p="xs"
                  style={{
                    borderRadius: 6,
                    backgroundColor: isSelected
                      ? 'var(--mantine-primary-color-light)'
                      : 'transparent',
                    border: isSelected
                      ? '1px solid var(--mantine-primary-color-light-hover)'
                      : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconFileText
                        size={15}
                        color={
                          isSelected
                            ? 'var(--mantine-primary-color-filled)'
                            : 'var(--mantine-color-dimmed)'
                        }
                      />
                      <Text
                        size="xs"
                        fw={isSelected ? 600 : 500}
                        truncate
                        c={isSelected ? 'var(--mantine-primary-color-filled)' : undefined}
                      >
                        {formattedDate}
                      </Text>
                    </Group>
                    {note.date === todayStr && (
                      <Badge size="xs" variant="dot" color="primary">
                        {t('nav.today')}
                      </Badge>
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}

            {filteredNotes.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                No notes found
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </div>

      {/* Vault Path Footer Widget */}
      {settings && (
        <Paper
          withBorder
          p="xs"
          radius="md"
          style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconFolder size={16} />
              <Text size="xs" truncate style={{ fontFamily: 'monospace', maxWidth: 160 }}>
                {settings.vaultPath.split(/[/\\]/).pop() || 'Vault'}
              </Text>
            </Group>
            <Group gap={4}>
              <Tooltip label={t('settings.openInFinder')} withArrow>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => window.electronAPI?.openInFileManager(settings.vaultPath)}
                >
                  <IconFolderOpen size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>
      )}
    </div>
  );
};
