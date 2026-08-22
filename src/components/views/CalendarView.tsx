import React, { useState, useMemo } from 'react';
import {
  Paper,
  Grid,
  Group,
  Stack,
  Title,
  Text,
  Button,
  Badge,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
  IconEdit,
  IconFileText,
  IconCalendarWeek,
  IconCalendarMonth,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { MarkdownViewer } from '../viewer/MarkdownViewer';

export const CalendarView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    selectedDate,
    setSelectedDate,
    setCurrentView,
    notesList,
    activeNote,
    settings,
    tasks,
    openTaskModal,
  } = useAppStore();

  const [calendarDate, setCalendarDate] = useState<Date>(dayjs(selectedDate).toDate());

  // Set of dates that have notes
  const notesDateSet = useMemo(() => {
    return new Set(notesList.map((n) => n.date));
  }, [notesList]);

  // Tasks for the selected date (either created on or due on this date)
  const dayTasks = useMemo(() => {
    return tasks.filter((task) => task.created === selectedDate || task.due === selectedDate);
  }, [tasks, selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    setCalendarDate(date);
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    setSelectedDate(dateStr);
  };


  const handleOpenInEditor = () => {
    setCurrentView('daily');
  };

  const handleGoToWeekly = () => {
    setCurrentView('weekly');
  };

  const handleGoToMonthly = () => {
    setCurrentView('monthly');
  };

  const formattedDateTitle = dayjs(selectedDate)
    .locale(i18n.language === 'es' ? 'es' : 'en')
    .format('dddd, MMMM D, YYYY');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>{t('calendar.title')}</Title>
          <Text size="xs" c="dimmed">
            {t('calendar.subtitle')} • {notesList.length} {t('calendar.totalNotes')}
          </Text>
        </div>

        <Group gap="xs">
          <Button
            variant="light"
            size="sm"
            leftSection={<IconCalendarWeek size={16} />}
            onClick={handleGoToWeekly}
            radius="md"
          >
            {t('nav.weekly')}
          </Button>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconCalendarMonth size={16} />}
            onClick={handleGoToMonthly}
            radius="md"
          >
            {t('nav.monthly')}
          </Button>
        </Group>
      </Group>

      {/* Main Grid: Calendar Picker on left, Note Preview on right */}
      <Grid style={{ flex: 1, minHeight: 0 }} gutter="md">
        <Grid.Col span={{ base: 12, md: 5, lg: 4 }} style={{ height: '100%' }}>
          <Paper
            p="md"
            withBorder
            radius="md"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack align="center" gap="md" style={{ width: '100%' }}>
              <DatePicker
                value={calendarDate}
                onChange={handleDateChange}
                size="md"
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
                            width: 5,
                            height: 5,
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

              <Group gap="xs" justify="center">
                <Badge variant="dot" color="primary" size="sm">
                  {t('calendar.daysWithNotes')}
                </Badge>
              </Group>
            </Stack>

            <Button
              fullWidth
              variant="filled"
              color="primary"
              leftSection={<IconEdit size={16} />}
              onClick={handleOpenInEditor}
              radius="md"
              mt="md"
            >
              {t('calendar.openInDaily')}
            </Button>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7, lg: 8 }} style={{ height: '100%' }}>
          <Paper
            p="md"
            withBorder
            radius="md"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconFileText size={20} color="var(--mantine-primary-color-filled)" />
                <Text fw={700} size="md" style={{ textTransform: 'capitalize' }}>
                  {formattedDateTitle}
                </Text>
                {activeNote?.exists ? (
                  <Badge color="green" variant="light" size="sm">
                    {activeNote.tasksCompleted ?? 0}/{activeNote.tasksTotal ?? 0} {t('common.tasks')}
                  </Badge>
                ) : (
                  <Badge color="gray" variant="outline" size="sm">
                    No file on disk
                  </Badge>
                )}
              </Group>

              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconEdit size={14} />}
                onClick={handleOpenInEditor}
              >
                {t('editor.write')}
              </Button>
            </Group>

            {dayTasks.length > 0 && (
              <Paper withBorder p="xs" radius="md" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={4}>
                  {t('common.tasks')} ({dayTasks.length})
                </Text>
                <Group gap={6} wrap="wrap">
                  {dayTasks.map((tItem) => (
                    <Badge
                      key={tItem.id}
                      size="sm"
                      variant={tItem.status === 'done' ? 'light' : 'filled'}
                      color={tItem.status === 'done' ? 'teal' : 'primary'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openTaskModal(tItem)}
                    >
                      {tItem.status === 'done' ? '✓ ' : ''}{tItem.title}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            )}

            <div style={{ flex: 1, minHeight: 0 }}>
              <MarkdownViewer
                content={
                  activeNote?.content ||
                  `### ${formattedDateTitle}\n\n_No note created for this date yet._\n\nClick **"${t('calendar.openInDaily')}"** to start writing.`
                }
                allowToggleTasks={activeNote?.exists ?? false}
              />
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

    </div>
  );
};
