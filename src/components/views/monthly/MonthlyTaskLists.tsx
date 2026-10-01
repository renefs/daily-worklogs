import React from 'react';
import { Group, Paper, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconChevronRight as IconArrowRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TaskMeta } from '../../../types';

interface MonthlyTaskListsProps {
  completedTasks?: TaskMeta[];
  inProgressTasks?: TaskMeta[];
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
}

const fallbackCompletedTasks: TaskMeta[] = [
  { id: '1', filename: '1.md', filepath: '', title: 'Change password of sasentrywebcast service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
  { id: '2', filename: '2.md', filepath: '', title: 'Remove webcastd service account', status: 'done', created: '2026-09-01', completedDate: '2026-09-01' },
];

const fallbackInProgressTasks: TaskMeta[] = [
  { id: '3', filename: '3.md', filepath: '', title: 'Implement secure tokens and referer protection in Wowza', status: 'in_progress', created: '2026-09-01' },
  { id: '4', filename: '4.md', filepath: '', title: 'Migrate encoders-manager to Postgresql', status: 'in_progress', created: '2026-09-01' },
];

export const MonthlyTaskLists: React.FC<MonthlyTaskListsProps> = ({ completedTasks, inProgressTasks, onOpenTask, onViewTasks }) => {
  const { t } = useTranslation();
  const displayedCompletedTasks = completedTasks ?? fallbackCompletedTasks;
  const displayedInProgressTasks = inProgressTasks ?? fallbackInProgressTasks;
  return (
    <>
            {/* Equal-Height Bottom 2-Column Grid: Key achievements & In progress & carried over */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Key achievements */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.keyAchievements', 'Key achievements')}
                  </Text>
                </Group>

                <Stack gap={8}>
                  {displayedCompletedTasks.slice(0, 4).map((task) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => onOpenTask(task)}
                      style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <IconCheck size={14} color="var(--mantine-color-teal-filled)" style={{ flexShrink: 0 }} />
                          <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                            {task.title}
                          </Text>
                        </Group>
                        {task.completedDate && (
                          <Text size="xs" c="dimmed" style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {dayjs(task.completedDate).format('MMM D, YYYY')}
                          </Text>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={() => onViewTasks()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllCompleted', 'View all completed tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>

              {/* In progress & carried over */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndCarried', 'In progress & carried over')}
                  </Text>
                </Group>

                <Stack gap={8}>
                  {displayedInProgressTasks.slice(0, 4).map((task) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => onOpenTask(task)}
                      style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)', flexShrink: 0 }} />
                          <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                            {task.title}
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={() => onViewTasks()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllInProgress', 'View all in-progress tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>
    </>
  );
};
