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

  const {
    selectedDate,
    setSelectedDate,
    setCurrentView,
    notesList,
    settings,
    deleteActiveNote,
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
        leftSection={<IconPlus size={16} />}
        onClick={handleOpenToday}
        radius="md"
        style={{
          fontWeight: 600,
          boxShadow: selectedDate === todayStr ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
        }}
      >
        {t('nav.newToday')}
      </Button>

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

      {/* Recent Notes List */}
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
          <Stack gap={3}>
            {filteredNotes.map((note) => {
              const isSelected = note.date === selectedDate;
              const formattedDate = capitalizeFirstLetter(
                dayjs(note.date)
                  .locale(i18n.language === 'es' ? 'es' : 'en')
                  .format(i18n.language === 'es' ? 'ddd, D MMM, YYYY' : 'ddd, MMM D, YYYY')
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
                    <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconFileText
                        size={15}
                        style={{
                          color: isSelected
                            ? 'var(--mantine-primary-color-filled)'
                            : 'var(--app-sidebar-text-dimmed)',
                          flexShrink: 0,
                        }}
                      />
                      <Text
                        size="xs"
                        fw={isSelected ? 600 : 500}
                        truncate
                        style={{
                          color: isSelected
                            ? 'var(--mantine-primary-color-filled)'
                            : 'var(--app-sidebar-text)',
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

            {filteredNotes.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                No notes found
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

      {/* Vault Path Footer Widget (Claude-style workspace badge) */}
      {settings && (
        <Paper
          p="xs"
          radius="md"
          className="sidebar-workspace-badge"
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
                  maxWidth: 160,
                  color: 'var(--app-sidebar-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {settings.vaultPath.split(/[/\\]/).pop() || 'Vault'}
              </Text>
            </Group>
            <Group gap={4}>
              <Tooltip label={t('settings.openInFinder')} withArrow>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    if (window.electronAPI && settings?.vaultPath) {
                      window.electronAPI.openInFileManager(settings.vaultPath);
                    } else {
                      notifications.show({
                        title: t('settings.openInFinder'),
                        message: 'Native File Manager is available in the Electron desktop application window.',
                        color: 'blue',
                      });
                    }
                  }}
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
