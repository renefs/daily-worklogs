import React from 'react';
import { ActionIcon, Badge, Group, Paper, Switch, Text, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconEdit, IconExternalLink, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DailyRoutine, RoutineSchedule } from '../../../types';
import classes from './RoutinesSection.module.css';

export interface RoutineRowProps {
  routine: DailyRoutine;
  isFirst: boolean;
  isLast: boolean;
  /** When the routines feature is off, the row stays visible but cannot be changed. */
  disabled: boolean;
  onToggleEnabled: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenUrl: (url: string) => void;
}

const ScheduleBadge: React.FC<{ schedule: RoutineSchedule }> = ({ schedule }) => {
  const { t } = useTranslation();
  if (schedule === 'everyday') {
    return (
      <Badge size="xs" variant="light" color="blue">
        {t('routines.scheduleEveryday')}
      </Badge>
    );
  }
  if (schedule === 'weekdays') {
    return (
      <Badge size="xs" variant="light" color="cyan">
        {t('routines.scheduleWeekdays')}
      </Badge>
    );
  }
  const dayLabels = [
    t('routines.days.sun'),
    t('routines.days.mon'),
    t('routines.days.tue'),
    t('routines.days.wed'),
    t('routines.days.thu'),
    t('routines.days.fri'),
    t('routines.days.sat'),
  ];
  return (
    <Badge size="xs" variant="light" color="grape">
      {schedule.map((day) => dayLabels[day]).join(', ') || t('routines.scheduleCustom')}
    </Badge>
  );
};

export const RoutineRow: React.FC<RoutineRowProps> = ({
  routine,
  isFirst,
  isLast,
  disabled,
  onToggleEnabled,
  onMove,
  onEdit,
  onDelete,
  onOpenUrl,
}) => {
  const { t } = useTranslation();
  const rowClass = routine.enabled && !disabled ? classes.row : `${classes.row} ${classes.rowMuted}`;

  return (
    <Paper p="sm" withBorder radius="md" className={rowClass}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" className={classes.rowMain}>
          <Switch
            checked={routine.enabled}
            onChange={onToggleEnabled}
            disabled={disabled}
            size="xs"
            aria-label={t('routines.toggleRoutine', { title: routine.title })}
          />
          <div className={classes.rowMain}>
            <Group gap="xs" align="center" wrap="nowrap">
              <Text size="sm" fw={500} truncate className={routine.enabled ? undefined : classes.titleDisabled}>
                {routine.title}
              </Text>
              <ScheduleBadge schedule={routine.schedule} />
              {routine.url && (
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="blue"
                  aria-label={t('routines.openUrl')}
                  onClick={() => onOpenUrl(routine.url!)}
                  title={routine.url}
                >
                  <IconExternalLink size={12} />
                </ActionIcon>
              )}
            </Group>
            {routine.description && (
              <Text size="xs" c="dimmed" truncate>
                {routine.description}
              </Text>
            )}
          </div>
        </Group>

        <Group gap={4} wrap="nowrap">
          <Tooltip label={t('settings.moveUp')}>
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={disabled || isFirst}
              aria-label={t('routines.moveRoutineUp', { title: routine.title })}
              onClick={() => onMove('up')}
            >
              <IconArrowUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('settings.moveDown')}>
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={disabled || isLast}
              aria-label={t('routines.moveRoutineDown', { title: routine.title })}
              onClick={() => onMove('down')}
            >
              <IconArrowDown size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('routines.editRoutine')}>
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={disabled}
              aria-label={t('routines.editRoutineAria', { title: routine.title })}
              onClick={onEdit}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('routines.deleteRoutine')}>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="red"
              disabled={disabled}
              aria-label={t('routines.deleteRoutineAria', { title: routine.title })}
              onClick={onDelete}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
};
