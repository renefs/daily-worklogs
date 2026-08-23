import React, { useState } from 'react';
import {
  Group,
  SegmentedControl,
  Button,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Grid,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconEye,
  IconCalendarEvent,
  IconWriting,
  IconCode,
  IconChecklist,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import { DailyRoutinesPanel } from '../routines/DailyRoutinesPanel';

export const DailyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [layoutMode, setLayoutMode] = useState<'live' | 'split' | 'edit' | 'preview'>('live');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const {
    settings,
    selectedDate,
    setSelectedDate,
    activeNote,
    deleteActiveNote,
    toggleDailyRoutinesPanel,
  } = useAppStore();

  const dayObj = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  // Format date display based on current locale
  const formattedDateTitle = dayObj
    .locale(i18n.language === 'es' ? 'es' : 'en')
    .format('dddd, MMMM D, YYYY');

  const currentDayOfWeek = dayObj.day();
  const allRoutines = settings?.routines || [];
  const activeRoutines = allRoutines.filter((r) => {
    if (!r.enabled) return false;
    if (r.schedule === 'everyday') return true;
    if (r.schedule === 'weekdays') return currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
    if (Array.isArray(r.schedule)) return r.schedule.includes(currentDayOfWeek);
    return true;
  });
  const completedIds = settings?.routineCompletions?.[selectedDate] || [];
  const totalActiveRoutines = activeRoutines.length;
  const completedRoutinesCount = activeRoutines.filter((r) => completedIds.includes(r.id)).length;
  const isAllDone = totalActiveRoutines > 0 && completedRoutinesCount === totalActiveRoutines;
  const showRoutinesPanel = settings?.showDailyRoutinesPanel !== false;

  const handlePrevDay = () => {
    const prev = dayObj.subtract(1, 'day').format('YYYY-MM-DD');
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = dayObj.add(1, 'day').format('YYYY-MM-DD');
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(dayjs().format('YYYY-MM-DD'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Daily View Sub-Header */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="xs">
          <ActionIcon variant="default" size="lg" onClick={handlePrevDay} radius="md">
            <IconChevronLeft size={18} />
          </ActionIcon>

          <Button
            variant={isToday ? 'light' : 'default'}
            size="sm"
            leftSection={<IconCalendarEvent size={16} />}
            onClick={handleToday}
            radius="md"
          >
            {t('nav.today')}
          </Button>

          <ActionIcon variant="default" size="lg" onClick={handleNextDay} radius="md">
            <IconChevronRight size={18} />
          </ActionIcon>

          <Group gap="xs" ml="xs">
            <Text fw={700} size="lg" style={{ textTransform: 'capitalize' }}>
              {formattedDateTitle}
            </Text>
            {isToday && (
              <Badge color="primary" variant="light" size="md">
                {t('nav.today')}
              </Badge>
            )}
          </Group>
        </Group>

        <Group gap="xs">
          {/* Note Layout Switcher: Live, Split, Write, Preview */}
          <SegmentedControl
            value={layoutMode}
            onChange={(val) => setLayoutMode(val as any)}
            size="xs"
            radius="md"
            transitionDuration={180}
            className="nav-segmented-control"
            data={[
              {
                value: 'live',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconWriting size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.live')}</span>
                  </Group>
                ),
              },
              {
                value: 'split',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconColumns size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.split')}</span>
                  </Group>
                ),
              },
              {
                value: 'edit',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconCode size={15} stroke={1.8} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t('editor.write')}</span>
                  </Group>
                ),
              },
              {
                value: 'preview',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap" style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                    <IconEye size={15} stroke={1.8} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t('editor.preview')}</span>
                  </Group>
                ),
              },
            ]}
          />

          {/* Daily Routines Toggle Button (Right-aligned above Routines Panel) */}
          <Tooltip label={t('routines.togglePanel')}>
            <Button
              variant={showRoutinesPanel ? 'light' : 'default'}
              color={isAllDone ? 'teal' : 'primary'}
              size="xs"
              radius="md"
              leftSection={<IconChecklist size={15} />}
              onClick={toggleDailyRoutinesPanel}
            >
              {t('routines.panelTitle')}
              {totalActiveRoutines > 0 && (
                <Badge
                  size="xs"
                  variant={isAllDone ? 'filled' : 'light'}
                  color={isAllDone ? 'teal' : 'blue'}
                  ml={6}
                >
                  {completedRoutinesCount}/{totalActiveRoutines}
                </Badge>
              )}
            </Button>
          </Tooltip>
        </Group>
      </Group>

      {/* Main Body: Editor / Viewer Container + Right Side Routines Panel */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
        {/* Left Side: Editor / Viewer */}
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          {layoutMode === 'live' && (
            <div style={{ height: '100%' }}>
              <MarkdownEditor
                isLivePreview={true}
                onExportClick={() => setIsExportModalOpen(true)}
                onDeleteClick={() => setIsDeleteModalOpen(true)}
              />
            </div>
          )}

          {layoutMode === 'split' && (
            <Grid style={{ height: '100%' }} gutter="md">
              <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '100%' }}>
                <MarkdownEditor
                  isLivePreview={false}
                  onExportClick={() => setIsExportModalOpen(true)}
                  onDeleteClick={() => setIsDeleteModalOpen(true)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }} style={{ height: '100%' }}>
                <MarkdownViewer allowToggleTasks={true} />
              </Grid.Col>
            </Grid>
          )}

          {layoutMode === 'edit' && (
            <div style={{ height: '100%' }}>
              <MarkdownEditor
                isLivePreview={false}
                onExportClick={() => setIsExportModalOpen(true)}
                onDeleteClick={() => setIsDeleteModalOpen(true)}
              />
            </div>
          )}

          {layoutMode === 'preview' && (
            <div style={{ height: '100%' }}>
              <MarkdownViewer allowToggleTasks={true} />
            </div>
          )}
        </div>

        {/* Right Side: Daily Routines Panel */}
        {showRoutinesPanel && <DailyRoutinesPanel />}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('editor.deleteNote')}
        centered
        radius="md"
      >
        <Text size="sm" mb="lg">
          {t('editor.deleteConfirm', { date: selectedDate })}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setIsDeleteModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            color="red"
            onClick={async () => {
              await deleteActiveNote(selectedDate);
              setIsDeleteModalOpen(false);
            }}
          >
            {t('common.delete')}
          </Button>
        </Group>
      </Modal>

      {/* Export Modal */}
      {isExportModalOpen && activeNote && (
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Worklog - ${selectedDate}`}
          content={activeNote.content}
          defaultFileName={`worklog-${selectedDate}`}
        />
      )}
    </div>
  );
};

