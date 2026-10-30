import React, { useState } from 'react';
import { Stack, Paper, Group, Text, Button, Tooltip, Select, Box } from '@mantine/core';
import { IconRotate, IconPlus, IconCheck, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig } from '../../../types';
import { getColumnTitle } from '../../kanban/columnUtils';
import { KanbanColumnModal } from '../board/KanbanColumnModal';
import { KanbanColumnRow } from '../board/KanbanColumnRow';
import { ColumnImpactModal } from '../board/ColumnImpactModal';
import { SettingsSection } from '../SettingsSection';
import {
  getMoveTargets,
  getTasksInColumns,
  pickDefaultTarget,
  planResetMoves,
} from '../board/columnImpact';

type PendingColumnAction =
  | { kind: 'delete'; column: KanbanColumnConfig }
  | { kind: 'hide'; column: KanbanColumnConfig }
  | { kind: 'reset' };

export const TaskBoardSection: React.FC = () => {
  const { t } = useTranslation();

  const closedWindowOptions = [
    { value: '7', label: t('settings.closedTasksWindowOption7') },
    { value: '14', label: t('settings.closedTasksWindowOption14') },
    { value: '30', label: t('settings.closedTasksWindowOption30') },
    { value: '90', label: t('settings.closedTasksWindowOption90') },
    { value: 'all', label: t('settings.closedTasksWindowAll') },
  ];

  const { settings, tasks, updateSettings, moveTasksToStatus } = useAppStoreSelector((state) => ({
    settings: state.settings,
    tasks: state.tasks,
    updateSettings: state.updateSettings,
    moveTasksToStatus: state.moveTasksToStatus,
  }));

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingColumnAction | null>(null);
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  if (!settings) return null;

  const currentColumns: KanbanColumnConfig[] =
    settings.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;

  const showVisibleColumnsNotice = () => {
    notifications.show({
      title: t('settings.taskBoard'),
      message: t('settings.visibleColumnsNotice'),
      color: 'orange',
    });
  };

  const saveColumnVisibility = async (columnId: string, visible: boolean) => {
    await updateSettings({
      kanbanColumns: currentColumns.map((col) => (col.id === columnId ? { ...col, visible } : col)),
    });
  };

  const handleToggleColumnVisibility = async (column: KanbanColumnConfig) => {
    if (column.visible === false) {
      await saveColumnVisibility(column.id, true);
      return;
    }
    if (currentColumns.filter((c) => c.visible !== false).length <= 1) {
      showVisibleColumnsNotice();
      return;
    }
    // Hiding keeps the tasks on disk but removes them from the board, so ask first.
    if (getTasksInColumns(tasks, [column.id]).length > 0) {
      setPendingAction({ kind: 'hide', column });
      return;
    }
    await saveColumnVisibility(column.id, false);
  };

  const handleMoveColumn = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentColumns.length) return;

    const newCols = [...currentColumns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, moved);

    await updateSettings({ kanbanColumns: newCols });
  };

  const handleSaveColumn = async (col: KanbanColumnConfig, isEdit: boolean) => {
    const previous = currentColumns.find((c) => c.id === col.id);
    // The edit form can also hide a column; that needs the same confirmation as the switch.
    const hidesTasks =
      isEdit &&
      previous?.visible !== false &&
      col.visible === false &&
      getTasksInColumns(tasks, [col.id]).length > 0;
    const columnToSave = hidesTasks ? { ...col, visible: true } : col;

    const updated = isEdit
      ? currentColumns.map((c) => (c.id === col.id ? columnToSave : c))
      : [...currentColumns, columnToSave];
    await updateSettings({ kanbanColumns: updated });
    notifications.show({
      title: isEdit ? t('settings.columnUpdated') : t('settings.columnCreated'),
      message: col.title,
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
    if (hidesTasks) setPendingAction({ kind: 'hide', column: columnToSave });
  };

  const handleRequestDelete = (column: KanbanColumnConfig) => {
    const targets = getMoveTargets(currentColumns, column.id);
    if (targets.length === 0) {
      showVisibleColumnsNotice();
      return;
    }
    setPendingAction({ kind: 'delete', column });
  };

  const failMove = () => {
    notifications.show({
      title: t('settings.taskBoard'),
      message: t('settings.moveTasksFailed'),
      color: 'red',
    });
  };

  const applyPendingAction = async (moveTargetId: string | null) => {
    if (!pendingAction) return;
    setIsApplyingAction(true);
    try {
      if (pendingAction.kind === 'hide') {
        await saveColumnVisibility(pendingAction.column.id, false);
      } else if (pendingAction.kind === 'delete') {
        const { column } = pendingAction;
        const affected = getTasksInColumns(tasks, [column.id]);
        // Tasks move first so a failed move never leaves them without a visible column.
        if (affected.length > 0) {
          if (!moveTargetId) return;
          const moved = await moveTasksToStatus(
            affected.map((task) => ({ filename: task.filename, status: moveTargetId }))
          );
          if (!moved) {
            failMove();
            return;
          }
        }
        await updateSettings({ kanbanColumns: currentColumns.filter((c) => c.id !== column.id) });
        notifications.show({
          title: t('settings.columnDeleted'),
          message: getColumnTitle(column, t),
          color: 'red',
          icon: <IconTrash size={16} />,
        });
      } else {
        const moves = planResetMoves(tasks, currentColumns);
        if (moves.length > 0 && !(await moveTasksToStatus(moves))) {
          failMove();
          return;
        }
        await updateSettings({ kanbanColumns: DEFAULT_KANBAN_COLUMNS });
        notifications.show({
          title: t('settings.columnsReset'),
          message: t('settings.savedSuccess'),
          color: 'teal',
          icon: <IconRotate size={16} />,
        });
      }
      setPendingAction(null);
    } finally {
      setIsApplyingAction(false);
    }
  };

  const renderImpactModal = () => {
    if (!pendingAction) return null;
    const common = {
      opened: true,
      cancelLabel: t('common.cancel'),
      loading: isApplyingAction,
      onClose: () => setPendingAction(null),
      onConfirm: applyPendingAction,
    };

    if (pendingAction.kind === 'hide') {
      const count = getTasksInColumns(tasks, [pendingAction.column.id]).length;
      return (
        <ColumnImpactModal
          {...common}
          title={t('settings.hideColumnTitle')}
          message={t('settings.hideColumnWarning', {
            count,
            title: getColumnTitle(pendingAction.column, t),
          })}
          confirmLabel={t('settings.hideColumnConfirm')}
          confirmColor="primary"
        />
      );
    }

    if (pendingAction.kind === 'delete') {
      const { column } = pendingAction;
      const count = getTasksInColumns(tasks, [column.id]).length;
      const targets = getMoveTargets(currentColumns, column.id);
      return (
        <ColumnImpactModal
          {...common}
          title={t('settings.deleteColumn')}
          message={t('settings.deleteColumnConfirm', { title: getColumnTitle(column, t) })}
          taskNotice={count > 0 ? t('settings.deleteColumnTasks', { count }) : undefined}
          moveTargets={
            count > 0
              ? targets.map((col) => ({ value: col.id, label: getColumnTitle(col, t) }))
              : undefined
          }
          moveTargetLabel={t('settings.moveTasksTo')}
          defaultMoveTarget={pickDefaultTarget(column, targets)?.id}
          confirmLabel={count > 0 ? t('settings.moveAndDelete', { count }) : t('common.delete')}
        />
      );
    }

    const moveCount = planResetMoves(tasks, currentColumns).length;
    return (
      <ColumnImpactModal
        {...common}
        title={t('settings.resetColumns')}
        message={t('settings.resetColumnsConfirm')}
        taskNotice={moveCount > 0 ? t('settings.resetColumnsTasks', { count: moveCount }) : undefined}
        confirmLabel={t('settings.resetColumns')}
      />
    );
  };

  const closedWindowSetting = settings.closedTasksWindowDays;
  const closedWindowValue =
    closedWindowSetting === null ? 'all' : String(closedWindowSetting === undefined ? 30 : closedWindowSetting);

  return (
    <SettingsSection
      title={t('settings.taskBoard')}
      description={t('settings.taskBoardDescription')}
      scope="vault"
    >
      <Stack gap="md">
        {/* Recent window for Done / Cancelled columns */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <Box flex={1} pr="md">
              <Text fw={600} size="sm">
                {t('settings.closedTasksWindow')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('settings.closedTasksWindowDescription')}
              </Text>
            </Box>
            <Select
              w={160}
              allowDeselect={false}
              aria-label={t('settings.closedTasksWindow')}
              data={closedWindowOptions}
              value={closedWindowValue}
              onChange={(value) =>
                updateSettings({ closedTasksWindowDays: value === 'all' || value === null ? null : Number(value) })
              }
            />
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div>
              <Text fw={600} size="sm">
                {t('settings.taskBoardColumns')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('settings.kanbanColumnsDescription')}
              </Text>
            </div>

            <Group gap="xs">
              <Tooltip label={t('settings.resetColumns')} withArrow>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconRotate size={14} />}
                  onClick={() => setPendingAction({ kind: 'reset' })}
                >
                  {t('settings.resetColumns')}
                </Button>
              </Tooltip>
              <Button
                variant="filled"
                color="primary"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => {
                  setEditingColumn(null);
                  setIsColumnModalOpen(true);
                }}
                radius="md"
              >
                {t('settings.addColumn')}
              </Button>
            </Group>
          </Group>
        </Paper>

        <Stack gap="xs">
          {currentColumns.map((col, index) => (
            <KanbanColumnRow
              key={col.id}
              column={col}
              isFirst={index === 0}
              isLast={index === currentColumns.length - 1}
              onMove={(direction) => handleMoveColumn(index, direction)}
              onToggleVisible={() => handleToggleColumnVisibility(col)}
              onEdit={() => {
                setEditingColumn(col);
                setIsColumnModalOpen(true);
              }}
              onDelete={() => handleRequestDelete(col)}
            />
          ))}
        </Stack>
      </Stack>

      <KanbanColumnModal
        opened={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        editingColumn={editingColumn}
        existingColumns={currentColumns}
        onSave={handleSaveColumn}
      />
      {renderImpactModal()}
    </SettingsSection>
  );
};
