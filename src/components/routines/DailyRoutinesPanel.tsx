import React, { useState } from 'react';
import classes from './DailyRoutinesPanel.module.css';
import {
  Paper,
  Stack,
  Group,
  Text,
  Checkbox,
  ActionIcon,
  Tooltip,
  Badge,
  Progress,
  Button,
  TextInput,
  ScrollArea,
  ThemeIcon,
  Box,
} from '@mantine/core';
import {
  IconChecklist,
  IconCheck,
  IconRotate,
  IconSettings,
  IconExternalLink,
  IconPlus,
  IconX,
  IconConfetti,
  IconListCheck,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DailyRoutine } from '../../types';

export const DailyRoutinesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    routineCompletionsByDate,
    selectedDate,
    toggleRoutineCompletion,
    completeAllDailyRoutines,
    resetDailyRoutines,
    saveRoutinesList,
    toggleDailyRoutinesPanel,
    openExternalUrl,
    openManageRoutinesModal,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    routineCompletionsByDate: state.routineCompletionsByDate,
    selectedDate: state.selectedDate,
    toggleRoutineCompletion: state.toggleRoutineCompletion,
    completeAllDailyRoutines: state.completeAllDailyRoutines,
    resetDailyRoutines: state.resetDailyRoutines,
    saveRoutinesList: state.saveRoutinesList,
    toggleDailyRoutinesPanel: state.toggleDailyRoutinesPanel,
    openExternalUrl: state.openExternalUrl,
    openManageRoutinesModal: state.openManageRoutinesModal,
  }));

  const [quickTitle, setQuickTitle] = useState('');

  const allRoutines: DailyRoutine[] = settings?.routines || [];
  const currentDayOfWeek = dayjs(selectedDate).day(); // 0 (Sun) to 6 (Sat)

  // Filter routines active for selectedDate
  const activeRoutines = allRoutines.filter((r) => {
    if (!r.enabled) return false;
    if (r.schedule === 'everyday') return true;
    if (r.schedule === 'weekdays') {
      return currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
    }
    if (Array.isArray(r.schedule)) {
      return r.schedule.includes(currentDayOfWeek);
    }
    return true;
  });

  const completedIds: string[] = routineCompletionsByDate[selectedDate] || [];
  const totalCount = activeRoutines.length;
  const completedCount = activeRoutines.filter((r) => completedIds.includes(r.id)).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  const handleToggle = async (routineId: string) => {
    await toggleRoutineCompletion(selectedDate, routineId);
  };

  const handleCheckAll = async () => {
    const activeIds = activeRoutines.map((r) => r.id);
    await completeAllDailyRoutines(selectedDate, activeIds);
  };

  const handleReset = async () => {
    await resetDailyRoutines(selectedDate);
  };

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    const newRoutine: DailyRoutine = {
      id: `routine-${Date.now()}`,
      title: quickTitle.trim(),
      schedule: 'everyday',
      enabled: true,
    };

    await saveRoutinesList([...allRoutines, newRoutine]);
    setQuickTitle('');
  };

  return (
    <Paper
      withBorder
      radius="md"
      className={classes.panel}
    >
      {/* Header */}
      <Box
        p="xs"
        style={{
          borderBottom: '1px solid var(--app-subtle-border)',
          backgroundColor: 'var(--app-card-bg)',
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <ThemeIcon variant="light" size="sm" radius="md" color="teal">
              <IconChecklist size={15} />
            </ThemeIcon>
            <Text fw={600} size="sm" truncate>
              {t('routines.panelTitle')}
            </Text>
            {totalCount > 0 && (
              <Badge
                size="xs"
                variant={isAllDone ? 'filled' : 'light'}
                color={isAllDone ? 'teal' : 'blue'}
              >
                {completedCount}/{totalCount}
              </Badge>
            )}
          </Group>

          <Group gap={2} wrap="nowrap">
            <Tooltip label={t('routines.checkAll')}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="teal"
                disabled={totalCount === 0 || isAllDone}
                onClick={handleCheckAll}
              >
                <IconCheck size={15} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t('routines.reset')}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                disabled={completedCount === 0}
                onClick={handleReset}
              >
                <IconRotate size={15} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t('routines.manage')}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={openManageRoutinesModal}
              >
                <IconSettings size={15} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t('common.close')}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={toggleDailyRoutinesPanel}
              >
                <IconX size={15} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Progress bar */}
        {totalCount > 0 && (
          <Box mt={8}>
            <Progress
              value={progressPercent}
              size="xs"
              radius="xl"
              color={isAllDone ? 'teal' : 'primary'}
              animated={progressPercent > 0 && !isAllDone}
            />
            <Group justify="space-between" mt={4}>
              <Text size="11px" c="dimmed">
                {t('routines.progress', { completed: completedCount, total: totalCount })}
              </Text>
              <Text size="11px" fw={600} c={isAllDone ? 'teal' : 'dimmed'}>
                {progressPercent}%
              </Text>
            </Group>
          </Box>
        )}
      </Box>

      {/* Routine list */}
      <ScrollArea style={{ flex: 1 }} p="xs">
        {totalCount === 0 ? (
          <Stack align="center" justify="center" py="xl" gap="xs" style={{ opacity: 0.6 }}>
            <IconListCheck size={28} />
            <Text size="xs" ta="center" c="dimmed">
              {allRoutines.length === 0
                ? t('routines.noRoutinesConfigured')
                : t('routines.noneScheduled')}
            </Text>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              onClick={openManageRoutinesModal}
            >
              {t('routines.manage')}
            </Button>
          </Stack>
        ) : (
          <Stack gap={6}>
            {isAllDone && (
              <Paper
                p="xs"
                radius="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-teal-light)',
                  border: '1px solid var(--mantine-color-teal-light-hover)',
                }}
              >
                <Group gap={6} justify="center">
                  <IconConfetti size={15} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={600} c="teal">
                    {t('routines.allDone')}
                  </Text>
                </Group>
              </Paper>
            )}

            {activeRoutines.map((routine) => {
              const isDone = completedIds.includes(routine.id);

              return (
                <Paper
                  key={routine.id}
                  p="xs"
                  withBorder
                  radius="sm"
                  style={{
                    backgroundColor: isDone
                      ? 'var(--app-subtle-bg)'
                      : 'var(--app-card-bg)',
                    borderColor: 'var(--app-card-border)',
                    opacity: isDone ? 0.75 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <Checkbox
                      checked={isDone}
                      onChange={() => handleToggle(routine.id)}
                      size="xs"
                      styles={{
                        input: { cursor: 'pointer' },
                      }}
                      label={
                        <div>
                          <Text
                            size="xs"
                            fw={500}
                            style={{
                              textDecoration: isDone ? 'line-through' : 'none',
                              color: isDone ? 'var(--mantine-color-dimmed)' : undefined,
                              lineHeight: 1.3,
                            }}
                          >
                            {routine.title}
                          </Text>
                          {routine.description && (
                            <Text size="10px" c="dimmed" lineClamp={1}>
                              {routine.description}
                            </Text>
                          )}
                        </div>
                      }
                      style={{ flex: 1, minWidth: 0 }}
                    />

                    {routine.url && (
                      <Tooltip label={`${t('routines.openUrl')}: ${routine.url}`}>
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            openExternalUrl(routine.url!);
                          }}
                        >
                          <IconExternalLink size={12} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </ScrollArea>

      {/* Quick Add Footer */}
      <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-body)', borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <form onSubmit={handleQuickAdd}>
          <Group gap={4} wrap="nowrap">
            <TextInput
              placeholder={t('routines.quickAddPlaceholder')}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              size="xs"
              style={{ flex: 1 }}
            />
            <ActionIcon
              variant="filled"
              size="input-xs"
              color="primary"
              type="submit"
              disabled={!quickTitle.trim()}
            >
              <IconPlus size={14} />
            </ActionIcon>
          </Group>
        </form>
      </Box>
    </Paper>
  );
};
