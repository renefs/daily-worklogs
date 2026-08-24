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
  Button,
  useComputedColorScheme,
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
  IconFolders,
  IconBriefcase,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem, TaskPriority } from '../../types';
import { formatLocalizedDateTitle } from '../../utils/dateTemplate';
import { getTagColor, parseTagHierarchy } from '../../utils/tagUtils';

interface PeriodTasksBreakdownProps {
  periodSummary: PeriodSummary | null;
  onOpenTask: (task: TaskItem) => void;
}

export const PeriodTasksBreakdown: React.FC<PeriodTasksBreakdownProps> = ({
  periodSummary,
  onOpenTask,
}) => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { allTags: storeAllTags } = useAppStore();

  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const completedList = periodSummary?.completedTasksList || [];
  const inProgressList = periodSummary?.inProgressTasksList || [];
  const waitingList = periodSummary?.waitingTasksList || [];
  const backlogList = periodSummary?.backlogTasksList || [];
  const dailyChecklists = periodSummary?.dailyChecklistItems || [];
  const tagBreakdown = periodSummary?.tagBreakdown || {};
  const priorityBreakdown = periodSummary?.priorityBreakdown || {};
  const serviceBreakdown = periodSummary?.serviceBreakdown || {};
  const projectBreakdown = periodSummary?.projectBreakdown || {};

  // Priority metadata
  const priorityMeta: Record<TaskPriority, { label: string; color: string }> = {
    urgent: { label: t('tasks.priorityUrgent'), color: 'red' },
    high: { label: t('tasks.priorityHigh'), color: 'orange' },
    medium: { label: t('tasks.priorityMedium'), color: 'blue' },
    low: { label: t('tasks.priorityLow'), color: 'gray' },
  };

  // Filter tasks based on selected service, project, tag & priority
  const filterTasks = (taskList: TaskItem[]) => {
    return taskList.filter((task) => {
      if (selectedPriority !== 'all') {
        if (task.priority !== selectedPriority) return false;
      }
      if (selectedTag !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTag)) return false;
      }
      if (selectedService !== 'all') {
        if (!task.tags || task.tags.length === 0) return false;
        const belongsToService = task.tags.some((tag) => {
          const { service } = parseTagHierarchy(tag, storeAllTags);
          return service.toLowerCase() === selectedService.toLowerCase();
        });
        if (!belongsToService) return false;
      }
      if (selectedProject !== 'all') {
        if (!task.tags || task.tags.length === 0) return false;
        const belongsToProject = task.tags.some((tag) => {
          const { service, project } = parseTagHierarchy(tag, storeAllTags);
          const pKey = `${service} / ${project}`;
          return (
            pKey.toLowerCase() === selectedProject.toLowerCase() ||
            project.toLowerCase() === selectedProject.toLowerCase()
          );
        });
        if (!belongsToProject) return false;
      }
      return true;
    });
  };

  const filteredCompleted = useMemo(() => filterTasks(completedList), [completedList, selectedTag, selectedPriority, selectedService, selectedProject, storeAllTags]);
  const filteredInProgress = useMemo(() => filterTasks(inProgressList), [inProgressList, selectedTag, selectedPriority, selectedService, selectedProject, storeAllTags]);
  const filteredWaiting = useMemo(() => filterTasks(waitingList), [waitingList, selectedTag, selectedPriority, selectedService, selectedProject, storeAllTags]);
  const filteredBacklog = useMemo(() => filterTasks(backlogList), [backlogList, selectedTag, selectedPriority, selectedService, selectedProject, storeAllTags]);

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

  // Sort services by total tasks descending
  const sortedServices = useMemo(() => {
    return Object.values(serviceBreakdown).sort((a, b) => b.total - a.total);
  }, [serviceBreakdown]);

  // Sort projects by total tasks descending
  const sortedProjects = useMemo(() => {
    return Object.values(projectBreakdown).sort((a, b) => b.total - a.total);
  }, [projectBreakdown]);

  const hasActiveFilters =
    selectedService !== 'all' ||
    selectedProject !== 'all' ||
    selectedTag !== 'all' ||
    selectedPriority !== 'all';

  const resetAllFilters = () => {
    setSelectedService('all');
    setSelectedProject('all');
    setSelectedTag('all');
    setSelectedPriority('all');
  };

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
      {/* Active Filter Bar (if any filter active) */}
      {hasActiveFilters && (
        <Paper
          withBorder
          p="xs"
          radius="md"
          style={{
            backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-blue-0)',
            borderColor: 'var(--mantine-color-blue-4)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="xs" wrap="wrap">
              <Text size="xs" fw={700} c="blue">
                Active Filter:
              </Text>
              {selectedService !== 'all' && (
                <Badge
                  color="indigo"
                  variant="filled"
                  size="sm"
                  rightSection={
                    <ActionIcon size="xs" color="indigo" variant="transparent" onClick={() => setSelectedService('all')}>
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  Service: {selectedService}
                </Badge>
              )}
              {selectedProject !== 'all' && (
                <Badge
                  color="violet"
                  variant="filled"
                  size="sm"
                  rightSection={
                    <ActionIcon size="xs" color="violet" variant="transparent" onClick={() => setSelectedProject('all')}>
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  Project: {selectedProject}
                </Badge>
              )}
              {selectedTag !== 'all' && (
                <Badge
                  color={getTagColor(selectedTag, storeAllTags)}
                  variant="filled"
                  size="sm"
                  rightSection={
                    <ActionIcon size="xs" color="gray" variant="transparent" onClick={() => setSelectedTag('all')}>
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  #{selectedTag}
                </Badge>
              )}
              {selectedPriority !== 'all' && (
                <Badge
                  color={priorityMeta[selectedPriority as TaskPriority]?.color || 'gray'}
                  variant="filled"
                  size="sm"
                  rightSection={
                    <ActionIcon size="xs" color="gray" variant="transparent" onClick={() => setSelectedPriority('all')}>
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  Priority: {selectedPriority}
                </Badge>
              )}
            </Group>
            <Button size="compact-xs" variant="subtle" color="red" onClick={resetAllFilters}>
              Reset All Filters
            </Button>
          </Group>
        </Paper>
      )}

      {/* Services & Projects Analytics Cards */}
      {(sortedServices.length > 0 || sortedProjects.length > 0) && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Top Services Card */}
          <Card withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="indigo" radius="md">
                  <IconFolders size={16} />
                </ThemeIcon>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  {t('reports.topServices') || 'Top Services Worked On'}
                </Text>
              </Group>
              {selectedService !== 'all' && (
                <Badge
                  variant="light"
                  size="xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedService('all')}
                >
                  Reset
                </Badge>
              )}
            </Group>

            <Stack gap="xs" mt="xs">
              {sortedServices.map((sItem) => {
                const isSelected = selectedService.toLowerCase() === sItem.service.toLowerCase();
                const pct = Math.round((sItem.completed / (sItem.total || 1)) * 100);
                const projectsCount = Object.keys(sItem.projects || {}).length;

                return (
                  <Paper
                    key={sItem.service}
                    p="xs"
                    radius="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--mantine-color-indigo-6)' : undefined,
                      backgroundColor: isSelected
                        ? isDark ? 'rgba(76, 110, 245, 0.15)' : 'rgba(76, 110, 245, 0.08)'
                        : undefined,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setSelectedService(isSelected ? 'all' : sItem.service)}
                  >
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {sItem.service}
                        </Text>
                        <Badge size="xs" variant="light" color="indigo">
                          {sItem.completed}/{sItem.total} done ({pct}%)
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {projectsCount} {projectsCount === 1 ? 'project' : 'projects'}
                      </Text>
                    </Group>
                    <Progress
                      value={pct}
                      size="sm"
                      radius="xl"
                      color="indigo"
                      animated={sItem.inProgress > 0}
                    />
                  </Paper>
                );
              })}
            </Stack>
          </Card>

          {/* Top Projects Card */}
          <Card withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="violet" radius="md">
                  <IconBriefcase size={16} />
                </ThemeIcon>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  {t('reports.topProjects') || 'Top Projects Worked On'}
                </Text>
              </Group>
              {selectedProject !== 'all' && (
                <Badge
                  variant="light"
                  size="xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProject('all')}
                >
                  Reset
                </Badge>
              )}
            </Group>

            <Stack gap="xs" mt="xs" style={{ maxHeight: 250, overflowY: 'auto' }}>
              {sortedProjects.map((pItem) => {
                const projectKey = `${pItem.service} / ${pItem.project}`;
                const isSelected = selectedProject.toLowerCase() === projectKey.toLowerCase();
                const pct = Math.round((pItem.completed / (pItem.total || 1)) * 100);

                return (
                  <Paper
                    key={projectKey}
                    p="xs"
                    radius="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--mantine-color-violet-6)' : undefined,
                      backgroundColor: isSelected
                        ? isDark ? 'rgba(130, 80, 223, 0.15)' : 'rgba(130, 80, 223, 0.08)'
                        : undefined,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setSelectedProject(isSelected ? 'all' : projectKey)}
                  >
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Badge size="xs" color="indigo" variant="outline">
                          {pItem.service}
                        </Badge>
                        <Text size="sm" fw={600}>
                          {pItem.project}
                        </Text>
                      </Group>
                      <Badge size="xs" variant="light" color="violet">
                        {pItem.completed}/{pItem.total} ({pct}%)
                      </Badge>
                    </Group>
                    <Progress value={pct} size="xs" radius="xl" color="violet" />
                  </Paper>
                );
              })}
            </Stack>
          </Card>
        </SimpleGrid>
      )}

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
                const tagColor = getTagColor(tag, storeAllTags);
                return (
                  <Badge
                    key={tag}
                    color={tagColor}
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
                  const dayTitle = formatLocalizedDateTitle(dateStr, i18n.language);
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
  const { allTags: storeAllTags } = useAppStore();
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
              task.tags.map((tag) => {
                const tagColor = getTagColor(tag, storeAllTags);
                return (
                  <Badge key={tag} color={tagColor} variant="light" size="xs">
                    #{tag}
                  </Badge>
                );
              })}
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
