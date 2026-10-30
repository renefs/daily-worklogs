import React, { useState } from 'react';
import {
  Stack,
  Paper,
  Group,
  Text,
  Button,
  Tooltip,
  Card,
  ActionIcon,
  Badge,
  Switch,
  Select,
  Box,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconRotate,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconEye,
  IconEyeOff,
  IconEdit,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { ColumnBehavior, DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig } from '../../../types';
import { getColumnIcon, getColumnTitle } from '../../kanban/columnUtils';
import { KanbanColumnModal } from './KanbanColumnModal';

export const KanbanSettingsTab: React.FC = () => {
  const { t } = useTranslation();

  const closedWindowOptions = [
    { value: '7', label: t('settings.closedTasksWindowOption7') },
    { value: '14', label: t('settings.closedTasksWindowOption14') },
    { value: '30', label: t('settings.closedTasksWindowOption30') },
    { value: '90', label: t('settings.closedTasksWindowOption90') },
    { value: 'all', label: t('settings.closedTasksWindowAll') },
  ];
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { settings, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);

  if (!settings) return null;

  const currentColumns: KanbanColumnConfig[] =
    settings.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;

  const handleToggleColumnVisibility = async (colIdToToggle: string) => {
    const visibleCount = currentColumns.filter((c) => c.visible).length;
    const targetCol = currentColumns.find((c) => c.id === colIdToToggle);

    if (targetCol && targetCol.visible && visibleCount <= 1) {
      notifications.show({
        title: t('settings.kanbanColumns'),
        message: t('settings.visibleColumnsNotice'),
        color: 'orange',
      });
      return;
    }

    const updated = currentColumns.map((col) => {
      if (col.id === colIdToToggle) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });

    await updateSettings({ kanbanColumns: updated });
  };

  const handleMoveColumn = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentColumns.length) return;

    const newCols = [...currentColumns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, moved);

    await updateSettings({ kanbanColumns: newCols });
  };

  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setIsAddColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: KanbanColumnConfig) => {
    setEditingColumn(col);
    setIsAddColumnModalOpen(true);
  };

  const handleSaveColumn = async (col: KanbanColumnConfig, isEdit: boolean) => {
    if (isEdit) {
      const updated = currentColumns.map((c) => (c.id === col.id ? col : c));
      await updateSettings({ kanbanColumns: updated });
      notifications.show({
        title: t('settings.columnUpdated'),
        message: col.title,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } else {
      const updated = [...currentColumns, col];
      await updateSettings({ kanbanColumns: updated });
      notifications.show({
        title: t('settings.columnCreated'),
        message: col.title,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleDeleteColumn = async (columnIdToDelete: string) => {
    const updated = currentColumns.filter((c) => c.id !== columnIdToDelete);
    await updateSettings({ kanbanColumns: updated });

    notifications.show({
      title: t('settings.columnDeleted'),
      message: columnIdToDelete,
      color: 'red',
      icon: <IconTrash size={16} />,
    });
  };

  const handleResetColumns = async () => {
    await updateSettings({ kanbanColumns: DEFAULT_KANBAN_COLUMNS });
    notifications.show({
      title: t('settings.columnsReset'),
      message: t('settings.savedSuccess'),
      color: 'teal',
      icon: <IconRotate size={16} />,
    });
  };

  const getBehaviorBadgeColor = (behavior: ColumnBehavior) => {
    switch (behavior) {
      case 'done':
        return 'teal';
      case 'cancelled':
        return 'red';
      case 'in_progress':
        return 'indigo';
      case 'waiting':
        return 'yellow';
      case 'todo':
        return 'blue';
      case 'backlog':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const closedWindowSetting = settings.closedTasksWindowDays;
  const closedWindowValue =
    closedWindowSetting === null ? 'all' : String(closedWindowSetting === undefined ? 30 : closedWindowSetting);

  return (
    <>
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
                {t('settings.kanbanColumns')}
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
                  onClick={handleResetColumns}
                >
                  {t('settings.resetColumns')}
                </Button>
              </Tooltip>
              <Button
                variant="filled"
                color="primary"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={handleOpenAddColumn}
                radius="md"
              >
                {t('settings.addColumn')}
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Columns List */}
        <Stack gap="xs">
          {currentColumns.map((col, index) => {
            const title = getColumnTitle(col, t);
            const isVisible = col.visible !== false;
            const behaviorBadgeColor = getBehaviorBadgeColor(col.behavior);

            return (
              <Card
                key={col.id}
                withBorder
                p="sm"
                radius="md"
                style={{
                  opacity: isVisible ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                  backgroundColor: isDark
                    ? isVisible
                      ? 'var(--mantine-color-dark-6)'
                      : 'var(--mantine-color-dark-8)'
                    : isVisible
                      ? '#ffffff'
                      : 'var(--mantine-color-gray-1)',
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  {/* Left: Reorder, Icon, Title & Details */}
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    {/* Reorder Up/Down */}
                    <Stack gap={2}>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="gray"
                        disabled={index === 0}
                        onClick={() => handleMoveColumn(index, -1)}
                      >
                        <IconArrowUp size={13} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="gray"
                        disabled={index === currentColumns.length - 1}
                        onClick={() => handleMoveColumn(index, 1)}
                      >
                        <IconArrowDown size={13} />
                      </ActionIcon>
                    </Stack>

                    {/* Column Color & Icon Tag */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: `var(--mantine-color-${col.color}-light)`,
                        color: `var(--mantine-color-${col.color}-filled)`,
                        flexShrink: 0,
                      }}
                    >
                      {getColumnIcon(col.iconName, 17)}
                    </div>

                    {/* Title and ID / Behavior */}
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={600} size="sm" truncate>
                          {title}
                        </Text>
                        {col.isCustom && (
                          <Badge size="xs" variant="outline" color="gray">
                            custom
                          </Badge>
                        )}
                      </Group>
                      <Group gap={6} wrap="wrap">
                        <Badge size="xs" color={behaviorBadgeColor} variant="light">
                          {col.behavior.replace('_', ' ')}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          id: {col.id}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>

                  {/* Right: Visibility toggle & Actions */}
                  <Group gap="xs" wrap="nowrap">
                    <Tooltip
                      label={isVisible ? t('settings.hideColumn') : t('settings.showColumn')}
                      withArrow
                    >
                      <Switch
                        checked={isVisible}
                        onChange={() => handleToggleColumnVisibility(col.id)}
                        size="sm"
                        color="teal"
                        onLabel={<IconEye size={12} />}
                        offLabel={<IconEyeOff size={12} />}
                      />
                    </Tooltip>

                    <Tooltip label={t('settings.editColumnTitle')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => handleOpenEditColumn(col)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>

                    {col.isCustom && (
                      <Tooltip label={t('settings.deleteColumn')} withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDeleteColumn(col.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      </Stack>

      <KanbanColumnModal
        opened={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        editingColumn={editingColumn}
        existingColumns={currentColumns}
        onSave={handleSaveColumn}
      />
    </>
  );
};
