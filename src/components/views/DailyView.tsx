import React, { useState } from 'react';
import {
  Group,
  Button,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChecklist,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import { DailyRoutinesPanel } from '../routines/DailyRoutinesPanel';
import { formatLocalizedDateTitle } from '../../utils/dateTemplate';

export const DailyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [layoutMode, setLayoutMode] = useState<'live' | 'split' | 'edit' | 'preview'>('live');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const {
    settings,
    routineCompletionsByDate,
    selectedDate,
    setSelectedDate,
    activeNote,
    deleteActiveNote,
    toggleDailyRoutinesPanel,
    externalNoteConflict,
    acceptExternalNote,
    keepLocalNote,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    routineCompletionsByDate: state.routineCompletionsByDate,
    selectedDate: state.selectedDate,
    setSelectedDate: state.setSelectedDate,
    activeNote: state.activeNote,
    deleteActiveNote: state.deleteActiveNote,
    toggleDailyRoutinesPanel: state.toggleDailyRoutinesPanel,
    externalNoteConflict: state.externalNoteConflict,
    acceptExternalNote: state.acceptExternalNote,
    keepLocalNote: state.keepLocalNote,
  }));

  const dayObj = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  // Format date display based on current locale (e.g. "Martes, 1 de septiembre de 2026")
  const formattedDateTitle = formatLocalizedDateTitle(selectedDate, i18n.language);

  const currentDayOfWeek = dayObj.day();
  const allRoutines = settings?.routines || [];
  const activeRoutines = allRoutines.filter((r) => {
    if (!r.enabled) return false;
    if (r.schedule === 'everyday') return true;
    if (r.schedule === 'weekdays') return currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
    if (Array.isArray(r.schedule)) return r.schedule.includes(currentDayOfWeek);
    return true;
  });
  const completedIds = routineCompletionsByDate[selectedDate] || [];
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
      {/* Daily View Single-Row Sub-Header */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <ActionIcon variant="default" size="sm" onClick={handlePrevDay} radius="md">
            <IconChevronLeft size={16} />
          </ActionIcon>

          <Button
            variant={isToday ? 'light' : 'default'}
            size="xs"
            onClick={handleToday}
            radius="md"
            style={{ fontWeight: 600 }}
          >
            {t('nav.today')}
          </Button>

          <ActionIcon variant="default" size="sm" onClick={handleNextDay} radius="md">
            <IconChevronRight size={16} />
          </ActionIcon>

          <Text
            fw={700}
            size="md"
            ml={8}
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {isToday ? t('daily.todaysWorklog', "Today's worklog") : formattedDateTitle}
          </Text>
        </Group>

        {/* Right Side: Daily Routines Counter */}
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

      {/* Main Body: Editor / Viewer Container + Right Side Routines Panel */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
        {/* Keep a single editor mounted so switching modes preserves undo, cursor, and scroll state. */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', gap: 12 }}>
          <div
            style={{
              display: layoutMode === 'preview' ? 'none' : 'block',
              flex: 1,
              minWidth: 0,
              height: '100%',
            }}
          >
            <MarkdownEditor
              isLivePreview={layoutMode === 'live'}
              layoutMode={layoutMode}
              onLayoutModeChange={setLayoutMode}
              onExportClick={() => setIsExportModalOpen(true)}
              onDeleteClick={() => setIsDeleteModalOpen(true)}
            />
          </div>

          {(layoutMode === 'split' || layoutMode === 'preview') && (
            <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {layoutMode === 'preview' && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px 8px 0 0',
                  border: '1px solid var(--app-card-border)',
                  borderBottom: 'none',
                  backgroundColor: 'var(--app-subtle-bg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text size="xs" fw={600} c="dimmed">
                  {t('editor.preview')}
                </Text>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <SegmentedControl
                    value={layoutMode}
                    onChange={(val: string) => setLayoutMode(val as 'live' | 'split' | 'edit' | 'preview')}
                    size="xs"
                    radius="md"
                    className="nav-segmented-control"
                    data={[
                      { label: t('editor.live'), value: 'live' },
                      { label: t('editor.split'), value: 'split' },
                      { label: t('editor.write'), value: 'edit' },
                      { label: t('editor.preview'), value: 'preview' },
                    ]}
                  />
                </div>
              </div>
              )}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                }}
              >
                <MarkdownViewer allowToggleTasks={true} />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Daily Routines Panel */}
        {showRoutinesPanel && <DailyRoutinesPanel />}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={externalNoteConflict?.date === selectedDate}
        onClose={() => undefined}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        title={t('daily.externalConflictTitle')}
        centered
      >
        <Text size="sm" mb="lg">{t('daily.externalConflictDescription')}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={acceptExternalNote}>{t('daily.useExternalVersion')}</Button>
          <Button onClick={() => void keepLocalNote()}>{t('daily.keepLocalVersion')}</Button>
        </Group>
      </Modal>

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
