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
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconEdit,
  IconEye,
  IconCalendarEvent,
  IconWriting,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';

export const DailyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [layoutMode, setLayoutMode] = useState<'live' | 'split' | 'edit' | 'preview'>('live');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const {
    selectedDate,
    setSelectedDate,
    activeNote,
    deleteActiveNote,
  } = useAppStore();

  const dayObj = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  // Format date display based on current locale
  const formattedDateTitle = dayObj
    .locale(i18n.language === 'es' ? 'es' : 'en')
    .format('dddd, MMMM D, YYYY');

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

        {/* Layout Switcher: Live Editor, Split, Edit Only, Preview Only */}
        <SegmentedControl
          value={layoutMode}
          onChange={(val) => setLayoutMode(val as any)}
          data={[
            {
              value: 'live',
              label: (
                <Group gap={6} justify="center">
                  <IconWriting size={16} />
                  <span>{t('editor.live')}</span>
                </Group>
              ),
            },
            {
              value: 'split',
              label: (
                <Group gap={6} justify="center">
                  <IconColumns size={16} />
                  <span>{t('editor.split')}</span>
                </Group>
              ),
            },
            {
              value: 'edit',
              label: (
                <Group gap={6} justify="center">
                  <IconEdit size={16} />
                  <span>{t('editor.write')}</span>
                </Group>
              ),
            },
            {
              value: 'preview',
              label: (
                <Group gap={6} justify="center">
                  <IconEye size={16} />
                  <span>{t('editor.preview')}</span>
                </Group>
              ),
            },
          ]}
          radius="md"
          size="sm"
        />
      </Group>

      {/* Editor / Viewer Container */}
      <div style={{ flex: 1, minHeight: 0 }}>
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
