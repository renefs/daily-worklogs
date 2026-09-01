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
  Menu,
  Modal,
  Collapse,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
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
  IconCalendarEvent,
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendarStats,
  IconLayoutKanban,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { DailyNoteMeta } from '../../types';
import { capitalizeFirstLetter, formatTemplateDate } from '../../utils/dateTemplate';

export const AppSidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    note: DailyNoteMeta;
  } | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(3);

  const {
    currentView,
    selectedDate,
    setSelectedDate,
    setCurrentView,
    notesList,
    settings,
    deleteActiveNote,
    isSidebarCollapsed,
    toggleSidebarCollapse,
  } = useAppStore();

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayNoteExists = useMemo(() => {
    return notesList.some((n) => n.date === todayStr);
  }, [notesList, todayStr]);

  // Set of dates that have notes
  const notesDateSet = useMemo(() => {
    return new Set((notesList || []).filter((n) => n && n.date).map((n) => n.date));
  }, [notesList]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    const list = notesList || [];
    if (!search.trim()) return list;
    return list.filter((n) => n && n.date && n.date.includes(search.trim()));
  }, [notesList, search]);

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
        d.locale(i18n.language === 'es' ? 'es' : 'en').format('MMMM [de] YYYY')
      );
      groups.push({ monthKey, monthTitle, notes });
    });

    return groups;
  }, [filteredNotes, i18n.language]);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentView('daily');
  };

  const handleOpenToday = () => {
    setSelectedDate(todayStr);
    setCurrentView('daily');
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

  // Render Collapsed Slim Rail (58px)
  const isEffectiveCollapsed = isSidebarCollapsed || currentView === 'task';
  if (isEffectiveCollapsed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          padding: '12px 6px',
          justifyContent: 'space-between',
          backgroundColor: 'var(--app-sidebar-bg)',
        }}
      >
        <Stack gap={8} align="center" style={{ width: '100%' }}>
          {/* Expand sidebar button */}
          <Tooltip label={t('nav.expandSidebar', 'Expand sidebar')} position="right">
            <ActionIcon
              variant="subtle"
              size="md"
              radius="md"
              onClick={() => toggleSidebarCollapse(false)}
            >
              <IconChevronsRight size={18} />
            </ActionIcon>
          </Tooltip>

          {/* Quick Create Today */}
          <Tooltip label={t('nav.newToday')} position="right">
            <ActionIcon
              variant={todayNoteExists ? 'light' : 'filled'}
              color="primary"
              size="md"
              radius="md"
              onClick={handleOpenToday}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>

          <div style={{ width: '80%', height: 1, backgroundColor: 'var(--app-sidebar-border)', margin: '4px 0' }} />

          {/* Quick view navigation icons */}
          <Tooltip label={t('nav.daily')} position="right">
            <ActionIcon
              variant={currentView === 'daily' ? 'filled' : 'subtle'}
              color={currentView === 'daily' ? 'primary' : 'gray'}
              size="md"
              radius="md"
              onClick={() => setCurrentView('daily')}
            >
              <IconCalendarEvent size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('nav.weekly')} position="right">
            <ActionIcon
              variant={currentView === 'weekly' ? 'filled' : 'subtle'}
              color={currentView === 'weekly' ? 'primary' : 'gray'}
              size="md"
              radius="md"
              onClick={() => setCurrentView('weekly')}
            >
              <IconCalendarWeek size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('nav.monthly')} position="right">
            <ActionIcon
              variant={currentView === 'monthly' ? 'filled' : 'subtle'}
              color={currentView === 'monthly' ? 'primary' : 'gray'}
              size="md"
              radius="md"
              onClick={() => setCurrentView('monthly')}
            >
              <IconCalendarMonth size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('nav.yearly')} position="right">
            <ActionIcon
              variant={currentView === 'yearly' ? 'filled' : 'subtle'}
              color={currentView === 'yearly' ? 'primary' : 'gray'}
              size="md"
              radius="md"
              onClick={() => setCurrentView('yearly')}
            >
              <IconCalendarStats size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t('nav.tasks')} position="right">
            <ActionIcon
              variant={currentView === 'tasks' || currentView === 'task' ? 'filled' : 'subtle'}
              color={currentView === 'tasks' || currentView === 'task' ? 'primary' : 'gray'}
              size="md"
              radius="md"
              onClick={() => setCurrentView('tasks')}
            >
              <IconLayoutKanban size={18} />
            </ActionIcon>
          </Tooltip>
        </Stack>

        {/* Bottom Rail Actions */}
        <Stack gap={8} align="center">
          {settings && (
            <Tooltip label={settings.vaultPath.split(/[/\\]/).pop() || 'Vault'} position="right">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                radius="md"
                onClick={() => {
                  if (window.electronAPI && settings?.vaultPath) {
                    window.electronAPI.openInFileManager(settings.vaultPath);
                  }
                }}
              >
                <IconFolder size={17} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label={t('nav.expandSidebar', 'Expand sidebar')} position="right">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => toggleSidebarCollapse(false)}
            >
              <IconChevronsRight size={15} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </div>
    );
  }

  // Render Full Sidebar (280px)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '10px',
      }}
    >
      {/* Top Action Row: Create Today's Note + Collapse Button */}
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Button
          fullWidth
          size="xs"
          variant={todayNoteExists ? 'light' : 'filled'}
          color="primary"
          leftSection={<IconPlus size={15} />}
          onClick={handleOpenToday}
          radius="md"
          style={{
            fontWeight: 600,
            boxShadow: todayNoteExists ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}
        >
          {t('nav.newToday')}
        </Button>

        <Tooltip label={t('nav.collapseSidebar', 'Collapse sidebar')} withArrow>
          <ActionIcon
            variant="subtle"
            size="md"
            radius="md"
            color="gray"
            onClick={() => toggleSidebarCollapse(true)}
            aria-label="Collapse sidebar"
          >
            <IconChevronsLeft size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Mini Date Picker */}
      <Paper p="xs" radius="md" className="sidebar-datepicker-container">
        <DatePicker
          locale={i18n.language === 'es' ? 'es' : 'en'}
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
            const isToday = dateStr === todayStr;

            return (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: hasNote ? 700 : isToday ? 600 : 'normal',
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
          tt="uppercase"
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
                            className="sidebar-note-btn"
                            data-active={isSelected ? 'true' : undefined}
                          >
                            <Group justify="space-between" wrap="nowrap">
                              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                                <IconFileText
                                  size={14}
                                  style={{
                                    color: isSelected
                                      ? 'var(--mantine-primary-color-filled)'
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
                                      ? 'var(--mantine-primary-color-filled)'
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
              ? `${formatTemplateDate(noteToDelete, 'dddd, MMMM D, YYYY', i18n.language)} (${noteToDelete}.md)`
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
          className="sidebar-workspace-badge"
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
                {settings.vaultPath.split(/[/\\]/).pop() || 'DailyWorklog'}
              </Text>
            </Group>
            <IconChevronRight size={14} style={{ color: 'var(--app-sidebar-text-dimmed)' }} />
          </Group>
        </Paper>
      )}
    </div>
  );
};

