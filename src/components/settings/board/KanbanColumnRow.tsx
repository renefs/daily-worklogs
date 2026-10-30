import React from 'react';
import { ActionIcon, Badge, Card, Group, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconEdit, IconEye, IconEyeOff, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ColumnBehavior, KanbanColumnConfig } from '../../../types';
import { getColumnIcon, getColumnTitle } from '../../kanban/columnUtils';
import classes from './KanbanColumnRow.module.css';

const BEHAVIOR_COLORS: Record<ColumnBehavior, string> = {
  done: 'teal',
  cancelled: 'red',
  in_progress: 'indigo',
  waiting: 'yellow',
  todo: 'blue',
  backlog: 'gray',
};

export interface KanbanColumnRowProps {
  column: KanbanColumnConfig;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const KanbanColumnRow: React.FC<KanbanColumnRowProps> = ({
  column,
  isFirst,
  isLast,
  onMove,
  onToggleVisible,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const title = getColumnTitle(column, t);
  const isVisible = column.visible !== false;
  const colorVars = {
    '--column-color-light': `var(--mantine-color-${column.color}-light)`,
    '--column-color-filled': `var(--mantine-color-${column.color}-filled)`,
  } as React.CSSProperties;

  return (
    <Card withBorder p="sm" radius="md" className={isVisible ? classes.row : `${classes.row} ${classes.rowHidden}`}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" className={classes.details}>
          <Stack gap={2}>
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              disabled={isFirst}
              aria-label={t('settings.moveColumnUp', { title })}
              onClick={() => onMove(-1)}
            >
              <IconArrowUp size={13} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              disabled={isLast}
              aria-label={t('settings.moveColumnDown', { title })}
              onClick={() => onMove(1)}
            >
              <IconArrowDown size={13} />
            </ActionIcon>
          </Stack>

          <div className={classes.iconBadge} style={colorVars}>
            {getColumnIcon(column.iconName, 17)}
          </div>

          <Stack gap={2} className={classes.details}>
            <Group gap={6} wrap="nowrap">
              <Text fw={600} size="sm" truncate>
                {title}
              </Text>
              {column.isCustom && (
                <Badge size="xs" variant="outline" color="gray">
                  {t('settings.customColumn')}
                </Badge>
              )}
            </Group>
            <Group gap={6} wrap="wrap">
              <Badge size="xs" color={BEHAVIOR_COLORS[column.behavior] ?? 'gray'} variant="light">
                {t(`settings.behaviorShort.${column.behavior}`)}
              </Badge>
              <Text size="xs" c="dimmed">
                {t('settings.columnIdLabel', { id: column.id })}
              </Text>
            </Group>
          </Stack>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Tooltip label={isVisible ? t('settings.hideColumn') : t('settings.showColumn')} withArrow>
            <Switch
              checked={isVisible}
              onChange={onToggleVisible}
              size="sm"
              aria-label={t('settings.toggleColumnVisibility', { title })}
              onLabel={<IconEye size={12} />}
              offLabel={<IconEyeOff size={12} />}
            />
          </Tooltip>

          <Tooltip label={t('settings.editColumnTitle')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t('settings.editColumnAria', { title })}
              onClick={onEdit}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>

          {column.isCustom && (
            <Tooltip label={t('settings.deleteColumn')} withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={t('settings.deleteColumnAria', { title })}
                onClick={onDelete}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
};
