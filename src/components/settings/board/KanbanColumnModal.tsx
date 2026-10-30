import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Select,
  Divider,
  Switch,
} from '@mantine/core';
import { IconLayoutKanban } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ColumnBehavior, KanbanColumnConfig } from '../../../types';
import {
  AVAILABLE_COLUMN_COLORS,
  AVAILABLE_COLUMN_ICONS,
  getColumnIcon,
  getColumnTitle,
} from '../../kanban/columnUtils';
import { ColorSwatchPicker } from '../appearance/ColorSwatchPicker';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

interface KanbanColumnModalProps {
  opened: boolean;
  onClose: () => void;
  editingColumn: KanbanColumnConfig | null;
  existingColumns: KanbanColumnConfig[];
  onSave: (col: KanbanColumnConfig, isEdit: boolean) => void | Promise<void>;
}

export const KanbanColumnModal: React.FC<KanbanColumnModalProps> = ({
  opened,
  onClose,
  editingColumn,
  existingColumns,
  onSave,
}) => {
  const { t } = useTranslation();

  const [colName, setColName] = useState('');
  const [colId, setColId] = useState('');
  const [colIdEdited, setColIdEdited] = useState(false);
  const [colColor, setColColor] = useState('blue');
  const [colIcon, setColIcon] = useState('circle-dot');
  const [colBehavior, setColBehavior] = useState<ColumnBehavior>('todo');
  const [colVisible, setColVisible] = useState(true);

  useEffect(() => {
    if (editingColumn) {
      setColName(getColumnTitle(editingColumn, t));
      setColId(editingColumn.id);
      setColIdEdited(true);
      setColColor(editingColumn.color || 'blue');
      setColIcon(editingColumn.iconName || 'circle-dot');
      setColBehavior(editingColumn.behavior || 'todo');
      setColVisible(editingColumn.visible !== false);
    } else {
      setColName('');
      setColId('');
      setColIdEdited(false);
      setColColor('indigo');
      setColIcon('circle-dot');
      setColBehavior('todo');
      setColVisible(true);
    }
  }, [editingColumn, opened, t]);

  const behaviorOptions = [
    { value: 'todo', label: t('settings.behaviorTodo') },
    { value: 'in_progress', label: t('settings.behaviorInProgress') },
    { value: 'done', label: t('settings.behaviorDone') },
    { value: 'cancelled', label: t('settings.behaviorCancelled') },
    { value: 'waiting', label: t('settings.behaviorWaiting') },
    { value: 'backlog', label: t('settings.behaviorBacklog') },
  ];

  const handleSave = () => {
    if (!colName.trim()) return;

    const finalId = colId.trim() || slugify(colName) || `col_${Date.now()}`;

    if (editingColumn) {
      const updated: KanbanColumnConfig = {
        ...editingColumn,
        title: colName.trim(),
        titleKey: undefined,
        color: colColor,
        iconName: colIcon,
        behavior: colBehavior,
        visible: colVisible,
      };
      void onSave(updated, true);
    } else {
      let uniqueId = finalId;
      let counter = 1;
      while (existingColumns.some((c) => c.id === uniqueId)) {
        uniqueId = `${finalId}_${counter}`;
        counter++;
      }

      const newColumn: KanbanColumnConfig = {
        id: uniqueId,
        title: colName.trim(),
        color: colColor,
        iconName: colIcon,
        behavior: colBehavior,
        visible: colVisible,
        isCustom: true,
      };
      void onSave(newColumn, false);
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLayoutKanban size={18} color="var(--mantine-primary-color-filled)" />
          <Text fw={700} size="md">
            {editingColumn ? t('settings.editColumnTitle') : t('settings.newColumnTitle')}
          </Text>
        </Group>
      }
      size="md"
      radius="md"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t('settings.columnName')}
          placeholder={t('settings.columnNamePlaceholder')}
          value={colName}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setColName(val);
            if (!colIdEdited && !editingColumn) {
              setColId(slugify(val));
            }
          }}
          required
          autoFocus
          radius="md"
        />

        {!editingColumn && (
          <TextInput
            label={t('settings.columnId')}
            placeholder={t('settings.columnIdPlaceholder')}
            value={colId}
            onChange={(e) => {
              setColIdEdited(true);
              setColId(e.currentTarget.value);
            }}
            description="Internal status code saved to markdown files (e.g. cancelled, review)"
            radius="md"
          />
        )}

        <div>
          <Select
            label={t('settings.columnBehavior')}
            description={t('settings.columnBehaviorDescription')}
            value={colBehavior}
            onChange={(val) => val && setColBehavior(val as ColumnBehavior)}
            data={behaviorOptions}
            allowDeselect={false}
            radius="md"
          />
        </div>

        <div>
          <Select
            label={t('settings.columnIcon')}
            value={colIcon}
            onChange={(val) => val && setColIcon(val)}
            data={AVAILABLE_COLUMN_ICONS.map((i) => ({ value: i.value, label: i.label }))}
            allowDeselect={false}
            radius="md"
            renderOption={({ option }) => {
              const iconObj = AVAILABLE_COLUMN_ICONS.find((i) => i.value === option.value);
              return (
                <Group gap="xs">
                  {iconObj?.icon}
                  <Text size="sm">{option.label}</Text>
                </Group>
              );
            }}
            leftSection={getColumnIcon(colIcon, 16)}
          />
        </div>

        <div>
          <Text size="sm" fw={500} mb={6}>
            {t('settings.columnColor')}
          </Text>
          <ColorSwatchPicker
            colors={AVAILABLE_COLUMN_COLORS}
            value={colColor}
            onChange={setColColor}
            label={t('settings.columnColor')}
          />
        </div>

        <Divider my="xs" />
        <Group justify="space-between">
          <div>
            <Text size="sm" fw={500}>
              {t('settings.showColumn')}
            </Text>
            <Text size="xs" c="dimmed">
              Show column in the Kanban board
            </Text>
          </div>
          <Switch checked={colVisible} onChange={(e) => setColVisible(e.currentTarget.checked)} />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} radius="md">
            {t('common.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            disabled={!colName.trim()}
            radius="md"
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
