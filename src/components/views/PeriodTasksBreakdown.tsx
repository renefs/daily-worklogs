import React, { useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Text,
  Badge,
  Card,
  Paper,
  Accordion,
  Progress,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Checkbox,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconPlayerPlay,
  IconHourglass,
  IconInbox,
  IconFlag,
  IconTag,
  IconCalendar,
  IconClockPlay,
  IconClockCheck,
  IconEdit,
  IconNotes,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { PeriodSummary, TaskItem, TaskPriority } from '../../types';

interface PeriodTasksBreakdownProps {
  periodSummary: PeriodSummary | null;
  onOpenTask: (task: TaskItem) => void;
}

export const PeriodTasksBreakdown: React.FC<PeriodTasksBreakdownProps> = ({
  periodSummary,
  onOpenTask,
}) => {
  const { t, i18n } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const completedList = periodSummary?.completedTasksList || [];
  const inProgressList = periodSummary?.inProgressTasksList || [];
  const waitingList = periodSummary?.waitingTasksList || [];
  const backlogList = periodSummary?.backlogTasksList || [];
  const dailyChecklists = periodSummary?.dailyChecklistItems || [];
  const tagBreakdown = periodSummary?.tagBreakdown || {};
  const priorityBreakdown = periodSummary?.priorityBreakdown || {};

  // Priority metadata
  const priorityMeta: Record<TaskPriority, { label: string; color: string }> = {
    urgent: { label: t('tasks.priorityUrgent'), color: 'red' },
    high: { label: t('tasks.priorityHigh'), color: 'orange' },
    medium: { label: t('tasks.priorityMedium'), color: 'blue' },
    low: { label: t('tasks.priorityLow'), color: 'gray' },
  };

  // Filter tasks based on selected tag & priority
  const filterTasks = (taskList: TaskItem[]) => {
    return taskList.filter((task) => {
      if (selectedTag !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTag)) return false;
      }
      if (selectedPriority !== 'all') {
        if (task.priority !== selectedPriority) return false;
      }
      return true;
    });
  };

  const filteredCompleted = useMemo(() => filterTasks(completedList), [completedList, selectedTag, selectedPriority]);
  const filteredInProgress = useMemo(() => filterTasks(inProgressList), [inProgressList, selectedTag, selectedPriority]);
  const filteredWaiting = useMemo(() => filterTasks(waitingList), [waitingList, selectedTag, selectedPriority]);
  const filteredBacklog = useMemo(() => filterTasks(backlogList), [backlogList, selectedTag, selectedPriority]);

  // Group daily checklist items by date
  const checklistsByDate = useMemo(() => {
    const map = new Map<string, Array<{ text: string; completed: boolean }>>();
    if (periodSummary?.days) {
      periodSummary.days.forEach((day) => {
        if (day.checklistItems && day.checklistItems.length > 0) {
          map.set(day.date, day.checklistItems);
        }
      });
    }
    return map;
  }, [periodSummary]);

  const totalPeriodTasks = (periodSummary?.periodTasks || []).length;
  const hasNoPeriodTasks = totalPeriodTasks === 0 && dailyChecklists.length === 0;

  if (hasNoPeriodTasks) {
    return (
      <Paper withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
        <Text c="dimmed" size="sm">
          {t('reports.noTasksInPeriod')}
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Priority & Tag Metrics Summary */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Priority Breakdown Card */}
        <Card withBorder radius="md" p="sm">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconFlag size={16} color="var(--mantine-primary-color-filled)" />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {t('reports.byPriority')}
              </Text>
            </Group>
            {selectedPriority !== 'all' && (
              <Badge
                variant="light"
                size="xs"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPriority('all')}
              >
                Reset
              </Badge>
            )}
          </Group>
          <Group gap="xs" wrap="wrap">
            {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((pKey) => {
              const data = priorityBreakdown[pKey] || { total: 0, completed: 0 };
              const meta = priorityMeta[pKey];
              const isSelected = selectedPriority === pKey;
              if (data.total === 0 && !isSelected) return null;
              return (
                <Badge
                  key={pKey}
                  color={meta.color}
                  variant={isSelected ? 'filled' : 'light'}
                  size="md"
                  radius="sm"
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onClick={() => setSelectedPriority(isSelected ? 'all' : pKey)}
                >
                  {meta.label}: {data.completed}/{data.total}
                </Badge>
              );
            })}
          </Group>
        </Card>

        {/* Tag Breakdown Card */}
        <Card withBorder radius="md" p="sm">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTag size={16} color="var(--mantine-primary-color-filled)" />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {t('reports.byTag')}
              </Text>
            </Group>
            {selectedTag !== 'all' && (
              <Badge
                variant="light"
                size="xs"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTag('all')}
              >
                Reset
              </Badge>
            )}
          </Group>
          <Group gap="xs" wrap="wrap">
            {Object.keys(tagBreakdown).length === 0 ? (
              <Text size="xs" c="dimmed">
                No tags recorded in this period
              </Text>
            ) : (
              Object.entries(tagBreakdown).map(([tag, data]) => {
                const isSelected = selectedTag === tag;
                return (
                  <Badge
                    key={tag}
                    color="indigo"
                    variant={isSelected ? 'filled' : 'outline'}
                    size="md"
                    radius="sm"
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                  >
                    #{tag}: {data.completed}/{data.total}
                  </Badge>
                );
              })
            )}
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main Task Category Accordions */}
      <Accordion
        multiple
        defaultValue={['completed', 'in_progress', 'waiting', 'daily_checklists']}
        variant="separated"
        radius="md"
      >
        {/* Completed This Period */}
        <Accordion.Item value="completed">
          <Accordion.Control
            icon={
              <ThemeIcon color="teal" variant="light" size="sm" radius="md">
                <IconCircleCheck size={16} />
              </ThemeIcon>
            }
          >
            <Group justify="space-between" pr="sm">
              <Text fw={600} size="sm">
                {t('reports.completedSection')}
              </Text>
              <Badge color="teal" variant="light" size="sm">
                {filteredCompleted.length} {t('common.tasks')}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            {filteredCompleted.length === 0 ? (
              <Text size="xs" c="dimmed" fs="italic" p="xs">
                No completed tasks matching current filters.
              </Text>
            ) : (
              <Stack gap="xs">
                {filteredCompleted.map((task) => (
                  <TaskReportCard
                    key={task.id || task.filename}
                    task={task}
                    priorityMeta={priorityMeta}
                    onOpenTask={onOpenTask}
                    isDark={isDark}
                  />
                ))}
              </Stack>
            )}
          </Accordion.Panel>
        </Accordion.Item>

        {/* In Progress */}
        <Accordion.Item value="in_progress">
          <Accordion.Control
            icon={
              <ThemeIcon color="indigo" variant="light" size="sm" radius="md">
                <IconPlayerPlay size={16} />
              </ThemeIcon>
            }
          >
            <Group justify="space-between" pr="sm">
              <Text fw={600} size="sm">
                {t('reports.inProgressSection')}
              </Text>
              <Badge color="indigo" variant="light" size="sm">
                {filteredInProgress.length} {t('common.tasks')}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            {filteredInProgress.length === 0 ? (
              <Text size="xs" c="dimmed" fs="italic" p="xs">
                No active tasks in progress matching current filters.
              </Text>
            ) : (
              <Stack gap="xs">
                {filteredInProgress.map((task) => (
                  <TaskReportCard
                    key={task.id || task.filename}
                    task={task}
                    priorityMeta={priorityMeta}
                    onOpenTask={onOpenTask}
                    isDark={isDark}
                  />
                ))}
              </Stack>
            )}
          </Accordion.Panel>
        </Accordion.Item>

        {/* Waiting / Blocked */}
        {filteredWaiting.length > 0 && (
          <Accordion.Item value="waiting">
            <Accordion.Control
              icon={
                <ThemeIcon color="yellow" variant="light" size="sm" radius="md">
                  <IconHourglass size={16} />
                </ThemeIcon>
              }
            >
              <Group justify="space-between" pr="sm">
                <Text fw={600} size="sm">
                  {t('reports.waitingSection')}
                </Text>
                <Badge color="yellow" variant="light" size="sm">
                  {filteredWaiting.length} {t('common.tasks')}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {filteredWaiting.map((task) => (
                  <TaskReportCard
                    key={task.id || task.filename}
                    task={task}
                    priorityMeta={priorityMeta}
                    onOpenTask={onOpenTask}
                    isDark={isDark}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* Backlog / Scheduled */}
        {filteredBacklog.length > 0 && (
          <Accordion.Item value="backlog">
            <Accordion.Control
              icon={
                <ThemeIcon color="blue" variant="light" size="sm" radius="md">
                  <IconInbox size={16} />
                </ThemeIcon>
              }
            >
              <Group justify="space-between" pr="sm">
                <Text fw={600} size="sm">
                  {t('reports.backlogSection')}
                </Text>
                <Badge color="blue" variant="light" size="sm">
                  {filteredBacklog.length} {t('common.tasks')}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {filteredBacklog.map((task) => (
                  <TaskReportCard
                    key={task.id || task.filename}
                    task={task}
                    priorityMeta={priorityMeta}
                    onOpenTask={onOpenTask}
                    isDark={isDark}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* Daily Notes Checklists */}
        {checklistsByDate.size > 0 && (
          <Accordion.Item value="daily_checklists">
            <Accordion.Control
              icon={
                <ThemeIcon color="teal" variant="light" size="sm" radius="md">
                  <IconNotes size={16} />
                </ThemeIcon>
              }
            >
              <Group justify="space-between" pr="sm">
                <Text fw={600} size="sm">
                  {t('reports.dailyChecklistsSection')}
                </Text>
                <Badge color="teal" variant="outline" size="sm">
                  {dailyChecklists.filter((c) => c.completed).length} / {dailyChecklists.length} {t('common.tasks')}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {Array.from(checklistsByDate.entries()).map(([dateStr, items]) => {
                  const dayTitle = dayjs(dateStr)
                    .locale(i18n.language === 'es' ? 'es' : 'en')
                    .format('dddd, MMMM D, YYYY');
                  const completedInDay = items.filter((i) => i.completed).length;

                  return (
                    <Card key={dateStr} withBorder radius="md" p="xs">
                      <Group justify="space-between" mb="xs">
                        <Text fw={600} size="xs">
                          {dayTitle} <Text span c="dimmed">({dateStr})</Text>
                        </Text>
                        <Badge size="xs" color={completedInDay === items.length ? 'teal' : 'blue'} variant="light">
                          {completedInDay} / {items.length} done
                        </Badge>
                      </Group>
                      <Stack gap={4}>
                        {items.map((item, idx) => (
                          <Group key={idx} gap="xs" wrap="nowrap">
                            <Checkbox checked={item.completed} readOnly size="xs" color="teal" />
                            <Text
                              size="xs"
                              style={{
                                textDecoration: item.completed ? 'line-through' : 'none',
                                color: item.completed ? 'var(--mantine-color-dimmed)' : undefined,
                              }}
                            >
                              {item.text}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </Stack>
  );
};

interface TaskReportCardProps {
  task: TaskItem;
  priorityMeta: Record<TaskPriority, { label: string; color: string }>;
  onOpenTask: (task: TaskItem) => void;
  isDark: boolean;
}

const TaskReportCard: React.FC<TaskReportCardProps> = ({
  task,
  priorityMeta,
  onOpenTask,
}) => {
  const pMeta = task.priority ? priorityMeta[task.priority] : priorityMeta.medium;
  const isCancelled = task.status === 'cancelled';
  const isDone = task.status === 'done' || isCancelled || !!task.completedDate;

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      style={{
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.1s ease',
      }}
      onClick={() => onOpenTask(task)}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="wrap">
            <Text
              fw={600}
              size="sm"
              style={{
                textDecoration: isDone ? 'line-through' : 'none',
                color: isDone ? 'var(--mantine-color-dimmed)' : undefined,
              }}
            >
              {task.title}
            </Text>
            {task.priority && (
              <Badge color={pMeta.color} size="xs" variant="filled">
                {pMeta.label}
              </Badge>
            )}
            {isCancelled && (
              <Badge color="red" size="xs" variant="outline">
                Cancelled
              </Badge>
            )}
          </Group>

          {/* Subtitle / Dates / Tags info */}
          <Group gap="xs" wrap="wrap">
            {task.completedDate && (
              <Badge
                leftSection={<IconClockCheck size={12} />}
                color={isCancelled ? 'red' : 'teal'}
                variant="light"
                size="xs"
              >
                {isCancelled ? 'Cancelled' : 'Done'}: {task.completedDate}
              </Badge>
            )}
            {task.startedDate && !task.completedDate && (
              <Badge
                leftSection={<IconClockPlay size={12} />}
                color="indigo"
                variant="light"
                size="xs"
              >
                Started: {task.startedDate}
              </Badge>
            )}
            {task.due && (
              <Badge
                leftSection={<IconCalendar size={12} />}
                color="gray"
                variant="outline"
                size="xs"
              >
                Due: {task.due}
              </Badge>
            )}
            {task.tags &&
              task.tags.map((tag) => (
                <Badge key={tag} color="indigo" variant="dot" size="xs">
                  #{tag}
                </Badge>
              ))}
          </Group>

          {/* Internal checklist progress if any */}
          {task.checklistTotal !== undefined && task.checklistTotal > 0 && (
            <Group gap="xs" mt={4} align="center">
              <Progress
                value={Math.round(((task.checklistCompleted || 0) / task.checklistTotal) * 100)}
                size="xs"
                color="teal"
                style={{ width: 80 }}
              />
              <Text size="xs" c="dimmed">
                {task.checklistCompleted || 0}/{task.checklistTotal} items
              </Text>
            </Group>
          )}
        </Stack>

        <Tooltip label="Open & Edit Task" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTask(task);
            }}
          >
            <IconEdit size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
};
