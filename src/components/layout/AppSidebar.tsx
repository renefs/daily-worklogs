import React, { useState, useMemo, useEffect } from 'react';
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
  Menu,
  Modal,
  Collapse,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconFileText,
  IconFolder,
  IconFolderOpen,
  IconTrash,
  IconEdit,
  IconChevronRight,
  IconChevronDown,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAppStore, useAppStoreSelector } from '../../store/useAppStore';
import { DailyNoteMeta } from '../../types';
import { capitalizeFirstLetter, formatDate } from '../../utils/dateFormat';
import classes from './AppSidebar.module.css';
import { SidebarCalendar } from './SidebarCalendar';

export const AppSidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [matchingDates, setMatchingDates] = useState<Set<string> | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    note: DailyNoteMeta;
  } | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(3);

  const cleanSearch = useMemo(() => {
    return search
      .replace(/^\[\[/, '')
      .replace(/\]\]$/, '')
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .trim();
  }, [search]);

  useEffect(() => {
    if (!cleanSearch) {
      setMatchingDates(null);
      return;
    }
    let active = true;
    const timeout = setTimeout(async () => {
      if (window.electronAPI?.searchNoteContents) {
        try {
          const dates = await window.electronAPI.searchNoteContents(cleanSearch);
          if (active) setMatchingDates(new Set(dates));
        } catch {
          if (active) setMatchingDates(null);
        }
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [cleanSearch]);

  const {
    currentView,
    selectedDate,
    setSelectedDate,
    setCurrentView,
    notesList,
    settings,
    deleteActiveNote,
  } = useAppStoreSelector((state) => ({
    currentView: state.currentView,
    selectedDate: state.selectedDate,
    setSelectedDate: state.setSelectedDate,
    setCurrentView: state.setCurrentView,
    notesList: state.notesList,
    settings: state.settings,
    deleteActiveNote: state.deleteActiveNote,
  }));

  const todayStr = dayjs().format('YYYY-MM-DD');
  // Set of dates that have notes
  const notesDateSet = useMemo(() => {
    return new Set((notesList || []).filter((n) => n && n.date).map((n) => n.date));
  }, [notesList]);

  // Filtered notes list (matches date or content)
  const filteredNotes = useMemo(() => {
    const list = notesList || [];
    if (!cleanSearch) return list;
    const lower = cleanSearch.toLowerCase();
    return list.filter((n) => {
      if (!n || !n.date) return false;
      if (n.date.toLowerCase().includes(lower)) return true;
      if (matchingDates && matchingDates.has(n.date)) return true;
      return false;
    });
  }, [notesList, cleanSearch, matchingDates]);

  // Group notes by month (YYYY-MM)
  const groupedNotes = useMemo(() => {
    const groups: { monthKey: string; monthTitle: string; notes: DailyNoteMeta[] }[] = [];
    const map = new Map<string, DailyNoteMeta[]>();

    (filteredNotes || []).forEach((note) => {
      if (!note || !note.date || typeof note.date !== 'string') return;
      const monthKey = note.date.substring(0, 7); // YYYY-MM
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }
      map.get(monthKey)!.push(note);
    });

    Array.from(map.entries()).forEach(([monthKey, notes]) => {
      const d = dayjs(`${monthKey}-01`);
      const monthTitle = capitalizeFirstLetter(
        d.locale(i18n.language === 'es' ? 'es' : 'en').format(i18n.language === 'es' ? 'MMMM [de] YYYY' : 'MMMM YYYY')
      );
      groups.push({ monthKey, monthTitle, notes });
    });

    return groups;
  }, [filteredNotes, i18n.language]);

  const handleSelectDate = async (dateStr: string) => {
    await setSelectedDate(dateStr);
    if (useAppStore.getState().selectedDate === dateStr) await setCurrentView('daily');
  };

  const handleOpenToday = () => {
    void handleSelectDate(todayStr);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    const targetDate = noteToDelete;
    await deleteActiveNote(targetDate);
    notifications.show({
      title: t('editor.deleteNote'),
      message: `${targetDate}.md`,
      color: 'red',
      icon: <IconTrash size={16} />,
    });
    setNoteToDelete(null);
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: prev[monthKey] === undefined ? false : !prev[monthKey],
    }));
  };

  return (
    <div className={classes.historySidebar}>
      <Group justify="space-between" px={6} py={4}>
        <Text fw={600} size="md">{t('nav.notes')}</Text>
      </Group>
      {/* Open today's note */}
      <Button
        fullWidth
        size="sm"
        variant="filled"
        color="primary"
        leftSection={<IconPlus size={16} />}
        onClick={handleOpenToday}
        radius="md"
        className={classes.todayButton}
      >
        {t('nav.newToday')}
      </Button>

      {/* Inline Calendar */}
      {currentView === 'daily' && (
        <SidebarCalendar
          selectedDate={selectedDate}
          notesDateSet={notesDateSet}
          locale={i18n.language === 'es' ? 'es' : 'en'}
          weekStartDay={settings?.weekStartDay ?? 1}
          onSelectDate={(date) => {
            void handleSelectDate(date);
          }}
        />
      )}

      {/* Search Filter */}
      <TextInput
        placeholder={t('nav.search')}
        size="xs"
        leftSection={<IconSearch size={14} style={{ color: 'var(--app-sidebar-text-dimmed)' }} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        radius="md"
        styles={{
          input: {
            backgroundColor: 'var(--app-subtle-bg)',
            borderColor: 'var(--app-sidebar-border)',
            color: 'var(--app-sidebar-text)',
          },
        }}
      />

      {/* Recent Notes List grouped by month */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Text
          size="xs"
          fw={700}

          mb={6}
          px={4}
          style={{
            letterSpacing: '0.04em',
            fontSize: '11px',
            color: 'var(--app-sidebar-text-dimmed)',
          }}
        >
          {t('sidebar.worklogHistory')} ({filteredNotes.length})
        </Text>

        <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
          <Stack gap={6}>
            {groupedNotes.slice(0, visibleMonthsCount).map((group) => {
              const isMonthExpanded = expandedMonths[group.monthKey] !== false; // default open

              return (
                <div key={group.monthKey} style={{ marginBottom: 4 }}>
                  {/* Month Accordion Header */}
                  <UnstyledButton
                    onClick={() => toggleMonth(group.monthKey)}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--app-sidebar-text-dimmed)',
                    }}
                  >
                    {isMonthExpanded ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                    <Text size="xs" fw={600} style={{ color: 'inherit', textTransform: 'capitalize' }}>
                      {group.monthTitle}
                    </Text>
                  </UnstyledButton>

                  {/* Notes in Month */}
                  <Collapse in={isMonthExpanded}>
                    <Stack gap={2} mt={2} pl={8}>
                      {group.notes.map((note) => {
                        const isSelected = note.date === selectedDate;
                        const formattedDate = capitalizeFirstLetter(
                          dayjs(note.date)
                            .locale(i18n.language === 'es' ? 'es' : 'en')
                            .format(i18n.language === 'es' ? 'ddd, D [de] MMM [de] YYYY' : 'ddd, MMM D, YYYY')
                        );

                        return (
                          <UnstyledButton
                            key={note.date}
                            onClick={() => handleSelectDate(note.date)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                note,
                              });
                            }}
                            className={clsx(classes.noteButton, 'sidebar-note-btn')}
                            data-active={isSelected ? 'true' : undefined}
                          >
                            <Group justify="space-between" wrap="nowrap">
                              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                                <IconFileText
                                  size={14}
                                  style={{
                                    color: isSelected
                                      ? 'var(--app-text-primary)'
                                      : 'var(--app-sidebar-text-dimmed)',
                                    flexShrink: 0,
                                  }}
                                />
                                <Text
                                  size="xs"
                                  fw={isSelected ? 600 : 450}
                                  truncate
                                  style={{
                                    color: isSelected
                                      ? 'var(--app-text-primary)'
                                      : 'var(--app-sidebar-text)',
                                    fontSize: 12,
                                  }}
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
                    </Stack>
                  </Collapse>
                </div>
              );
            })}

            {/* Show more button if there are more months */}
            {groupedNotes.length > visibleMonthsCount && (
              <Button
                variant="subtle"
                size="compact-xs"
                color="gray"
                onClick={() => setVisibleMonthsCount((prev) => prev + 3)}
                style={{ fontSize: 11, alignSelf: 'flex-start', marginLeft: 6 }}
              >
                {t('dashboard.showMore', 'Show more...')}
              </Button>
            )}

            {filteredNotes.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                {t('reports.noNotesFound', 'No notes found')}
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </div>

      {/* Context Menu */}
      <Menu
        opened={!!contextMenu}
        onClose={() => setContextMenu(null)}
        shadow="md"
        width={200}
        radius="md"
        position="bottom-start"
        withinPortal
      >
        <Menu.Target>
          <div
            style={{
              position: 'fixed',
              top: contextMenu?.y ?? 0,
              left: contextMenu?.x ?? 0,
              width: 1,
              height: 1,
              pointerEvents: 'none',
              visibility: 'hidden',
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          {contextMenu && (
            <>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => {
                  handleSelectDate(contextMenu.note.date);
                  setContextMenu(null);
                }}
              >
                {t('sidebar.openInDaily')}
              </Menu.Item>
              {settings?.vaultPath && (
                <Menu.Item
                  leftSection={<IconFolderOpen size={14} />}
                  onClick={() => {
                    if (window.electronAPI && settings?.vaultPath) {
                      window.electronAPI.openInFileManager(
                        contextMenu.note.filepath ||
                          `${settings.vaultPath}/${contextMenu.note.relativePath || contextMenu.note.filename}`
                      );
                    }
                    setContextMenu(null);
                  }}
                >
                  {t('settings.openInFinder')}
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => {
                  setNoteToDelete(contextMenu.note.date);
                  setContextMenu(null);
                }}
              >
                {t('editor.deleteNote')}
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        title={t('editor.deleteNote')}
        centered
        radius="md"
      >
        <Text size="sm" mb="lg">
          {t('editor.deleteConfirm', {
            date: noteToDelete
              ? `${formatDate(noteToDelete, 'dddd, MMMM D, YYYY', i18n.language)} (${noteToDelete}.md)`
              : '',
          })}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setNoteToDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button color="red" onClick={handleConfirmDelete}>
            {t('common.delete')}
          </Button>
        </Group>
      </Modal>

      {/* Vault Path Footer Widget */}
      {settings && (
        <Paper
          p="xs"
          radius="md"
          className={clsx(classes.workspaceBadge, 'sidebar-workspace-badge')}
          onClick={() => {
            if (window.electronAPI && settings?.vaultPath) {
              window.electronAPI.openInFileManager(settings.vaultPath);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconFolder
                size={16}
                style={{ color: 'var(--mantine-primary-color-filled)', flexShrink: 0 }}
              />
              <Text
                size="xs"
                fw={600}
                truncate
                style={{
                  maxWidth: 180,
                  color: 'var(--app-sidebar-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {settings.vaultPath.split(/[/\\]/).pop() || 'Worklog'}
              </Text>
            </Group>
            <IconChevronRight size={14} style={{ color: 'var(--app-sidebar-text-dimmed)' }} />
          </Group>
        </Paper>
      )}
    </div>
  );
};
