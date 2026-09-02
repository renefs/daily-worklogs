import React, { useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Text,
  Paper,
  Progress,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Checkbox,
  Menu,
  Divider,
  Collapse,
  TextInput,
  UnstyledButton,
  ScrollArea,
} from '@mantine/core';
import {
  IconChevronDown,
  IconSearch,
  IconEdit,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { PeriodSummary, TaskMeta, TaskPriority, DailyChecklistItem } from '../../types';
import { formatLocalizedDateTitle } from '../../utils/dateTemplate';
import { getTagColor } from '../../utils/tagUtils';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getProjectColor,
  resolveTaskContext,
} from '../../utils/areaProjectUtils';

interface PeriodTasksBreakdownProps {
  periodSummary: PeriodSummary | null;
  onOpenTask: (task: TaskMeta) => void;
}

/** Left stripe colour encoding task priority on a compact row. */
const PRIORITY_STRIPE: Record<TaskPriority, string> = {
  urgent: 'var(--mantine-color-red-6)',
  high: 'var(--mantine-color-orange-6)',
  medium: 'var(--mantine-color-blue-5)',
  low: 'var(--mantine-color-gray-4)',
};

export const PeriodTasksBreakdown: React.FC<PeriodTasksBreakdownProps> = ({
  periodSummary,
  onOpenTask,
}) => {
  const { t, i18n } = useTranslation();

  const {
    allTags: storeAllTags,
    areas = DEFAULT_AREAS,
    projects = [],
  } = useAppStoreSelector((state) => ({
    allTags: state.allTags,
    areas: state.areas,
    projects: state.projects,
  }));

  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['completed', 'in_progress']);

  const completedList = periodSummary?.completedTasksList || [];
  const inProgressList = periodSummary?.inProgressTasksList || [];
  const waitingList = periodSummary?.waitingTasksList || [];
  const backlogList = periodSummary?.backlogTasksList || [];
  const dailyChecklists = periodSummary?.dailyChecklistItems || [];
  const tagBreakdown = periodSummary?.tagBreakdown || {};
  const priorityBreakdown = periodSummary?.priorityBreakdown || {};
  const areaBreakdown = periodSummary?.serviceBreakdown || {};
  const projectBreakdown = periodSummary?.projectBreakdown || {};

  const priorityMeta: Record<TaskPriority, { label: string; color: string }> = {
    urgent: { label: t('tasks.priorityUrgent'), color: 'red' },
    high: { label: t('tasks.priorityHigh'), color: 'orange' },
    medium: { label: t('tasks.priorityMedium'), color: 'blue' },
    low: { label: t('tasks.priorityLow'), color: 'gray' },
  };

  // Filter tasks by area, project, tag, priority and free text
  const filterTasks = (taskList: TaskMeta[]) => {
    const q = query.trim().toLowerCase();
    return taskList.filter((task) => {
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
      if (selectedTag !== 'all' && !(task.tags || []).includes(selectedTag)) return false;

      const taskCtx = resolveTaskContext(task, areas, projects, storeAllTags);

      if (selectedArea !== 'all' && taskCtx.area.toLowerCase() !== selectedArea.toLowerCase()) {
        return false;
      }
      if (selectedProject !== 'all') {
        const pKey = `${taskCtx.area} / ${taskCtx.project}`;
        if (
          !taskCtx.project ||
          (pKey.toLowerCase() !== selectedProject.toLowerCase() &&
            taskCtx.project.toLowerCase() !== selectedProject.toLowerCase())
        ) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          task.title,
          `#${task.taskId ?? task.id ?? ''}`,
          ...(task.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  };

  const filterDeps = [selectedTag, selectedPriority, selectedArea, selectedProject, query, storeAllTags];
  const filteredCompleted = useMemo(() => filterTasks(completedList), [completedList, ...filterDeps]);
  const filteredInProgress = useMemo(() => filterTasks(inProgressList), [inProgressList, ...filterDeps]);
  const filteredWaiting = useMemo(() => filterTasks(waitingList), [waitingList, ...filterDeps]);
  const filteredBacklog = useMemo(() => filterTasks(backlogList), [backlogList, ...filterDeps]);

  // Group daily checklist items by date
  const checklistsByDate = useMemo(() => {
    const map = new Map<string, DailyChecklistItem[]>();
    (periodSummary?.days || []).forEach((day) => {
      if (day.checklistItems && day.checklistItems.length > 0) {
        map.set(day.date, day.checklistItems);
      }
    });
    return map;
  }, [periodSummary]);

  const sortedAreas = useMemo(
    () => Object.values(areaBreakdown).sort((a, b) => b.total - a.total),
    [areaBreakdown]
  );
  const sortedProjects = useMemo(
    () => Object.values(projectBreakdown).sort((a, b) => b.total - a.total),
    [projectBreakdown]
  );

  // Period-wide totals summarised in the collapsed strip header
  const totals = useMemo(
    () =>
      sortedAreas.reduce(
        (acc, a) => ({
          total: acc.total + a.total,
          completed: acc.completed + a.completed,
          inProgress: acc.inProgress + a.inProgress,
        }),
        { total: 0, completed: 0, inProgress: 0 }
      ),
    [sortedAreas]
  );

  const hasActiveFilters =
    selectedArea !== 'all' ||
    selectedProject !== 'all' ||
    selectedTag !== 'all' ||
    selectedPriority !== 'all' ||
    query.trim() !== '';

  const resetAllFilters = () => {
    setSelectedArea('all');
    setSelectedProject('all');
    setSelectedTag('all');
    setSelectedPriority('all');
    setQuery('');
  };

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const totalPeriodTasks = periodSummary?.periodTaskCount || 0;
  if (totalPeriodTasks === 0 && dailyChecklists.length === 0) {
    return (
      <Paper withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
        <Text c="dimmed" size="sm">
          {t('reports.noTasksInPeriod')}
        </Text>
      </Paper>
    );
  }

  const allLabel = t('reports.filterAll');
  const areaOptions = sortedAreas.map((a) => ({
    value: a.service,
    label: a.service,
    hint: `${a.completed}/${a.total}`,
  }));
  const projectOptions = sortedProjects.map((p) => ({
    value: `${p.service} / ${p.project}`,
    label: p.project,
    hint: `${p.completed}/${p.total}`,
  }));
  const tagOptions = Object.entries(tagBreakdown).map(([tag, data]) => ({
    value: tag,
    label: `#${tag}`,
    hint: `${data.completed}/${data.total}`,
  }));
  const priorityOptions = (['urgent', 'high', 'medium', 'low'] as TaskPriority[])
    .filter((p) => (priorityBreakdown[p]?.total || 0) > 0)
    .map((p) => ({
      value: p,
      label: priorityMeta[p].label,
      hint: `${priorityBreakdown[p].completed}/${priorityBreakdown[p].total}`,
    }));

  const groups: Array<{
    key: string;
    label: string;
    color: string;
    tasks: TaskMeta[];
    alwaysShow?: boolean;
  }> = [
    { key: 'completed', label: t('reports.completedSection'), color: 'teal', tasks: filteredCompleted, alwaysShow: true },
    { key: 'in_progress', label: t('reports.inProgressSection'), color: 'indigo', tasks: filteredInProgress, alwaysShow: true },
    { key: 'waiting', label: t('reports.waitingSection'), color: 'yellow', tasks: filteredWaiting },
    { key: 'backlog', label: t('reports.backlogSection'), color: 'blue', tasks: filteredBacklog },
  ];

  return (
    <Stack gap="sm">
      {/* 1 · Single control bar: text filter + four dropdown chips */}
      <div className="pbd-filterbar">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder={t('reports.filterPlaceholder')}
          size="xs"
          variant="unstyled"
          leftSection={<IconSearch size={14} />}
          style={{ flex: '1 1 180px', minWidth: 150 }}
        />
        <FilterChip
          label={t('areas.badgeArea', 'Area')}
          value={selectedArea}
          options={areaOptions}
          allLabel={allLabel}
          onChange={setSelectedArea}
        />
        <FilterChip
          label={t('areas.projectLabel', 'Project')}
          value={selectedProject}
          options={projectOptions}
          allLabel={allLabel}
          onChange={setSelectedProject}
        />
        <FilterChip
          label={t('tasks.tags', 'Tags')}
          value={selectedTag}
          displayValue={selectedTag === 'all' ? undefined : `#${selectedTag}`}
          options={tagOptions}
          allLabel={allLabel}
          emptyLabel={t('reports.noTagsInPeriod')}
          onChange={setSelectedTag}
        />
        <FilterChip
          label={t('tasks.priority', 'Priority')}
          value={selectedPriority}
          displayValue={
            selectedPriority === 'all'
              ? undefined
              : priorityMeta[selectedPriority as TaskPriority]?.label
          }
          options={priorityOptions}
          allLabel={allLabel}
          onChange={setSelectedPriority}
        />
        {hasActiveFilters && (
          <UnstyledButton onClick={resetAllFilters} style={{ marginLeft: 'auto' }}>
            <Group gap={4} c="dimmed">
              <IconX size={12} />
              <Text size="xs">{t('reports.clearFilters')}</Text>
            </Group>
          </UnstyledButton>
        )}
      </div>

      {/* 2 · One collapsible breakdown strip that summarises itself while closed */}
      {(sortedAreas.length > 0 || sortedProjects.length > 0) && (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <UnstyledButton
            className="pbd-strip-head"
            onClick={() => setBreakdownOpen((o) => !o)}
            aria-expanded={breakdownOpen}
          >
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
              {t('reports.breakdownLabel')}
            </Text>
            <Group gap="md" ml="md" wrap="nowrap" visibleFrom="sm">
              <Text size="xs" c="dimmed">
                {t('reports.doneOfTotal', { completed: totals.completed, total: totals.total })}
              </Text>
              <Progress.Root size={6} radius="xl" style={{ width: 110 }}>
                <Progress.Section
                  value={totals.total ? (totals.completed / totals.total) * 100 : 0}
                  color="teal"
                />
                <Progress.Section
                  value={totals.total ? (totals.inProgress / totals.total) * 100 : 0}
                  color="indigo"
                />
              </Progress.Root>
              <Text size="xs" c="dimmed">
                {sortedAreas.length} {t('areas.areasLabel')} · {sortedProjects.length}{' '}
                {t('areas.projectsLabel')}
              </Text>
            </Group>
            <span className={`pbd-caret${breakdownOpen ? ' open' : ''}`}>
              <IconChevronDown size={14} />
            </span>
          </UnstyledButton>

          <Collapse in={breakdownOpen}>
            <Divider />
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" p="sm">
              <Stack gap="xs">
                <MetricRows
                  label={t('reports.topAreas')}
                  rows={sortedAreas.map((a) => ({
                    key: a.service,
                    name: a.service,
                    hint: (() => {
                      const n = Object.keys(a.projects || {}).length;
                      const word = n === 1 ? t('areas.projectLabel') : t('areas.projectsLabel');
                      return `${n} ${word.toLowerCase()}`;
                    })(),
                    completed: a.completed,
                    total: a.total,
                    color: getAreaColor(a.service, areas),
                    selected: selectedArea.toLowerCase() === a.service.toLowerCase(),
                    onToggle: () =>
                      setSelectedArea(
                        selectedArea.toLowerCase() === a.service.toLowerCase() ? 'all' : a.service
                      ),
                  }))}
                />
                <PillRow
                  label={t('reports.byPriority')}
                  pills={priorityOptions.map((p) => ({
                    key: p.value,
                    label: `${p.label} ${p.hint}`,
                    color: priorityMeta[p.value as TaskPriority].color,
                    selected: selectedPriority === p.value,
                    onToggle: () =>
                      setSelectedPriority(selectedPriority === p.value ? 'all' : p.value),
                  }))}
                />
              </Stack>

              <Stack gap="xs">
                <MetricRows
                  label={t('reports.topProjects')}
                  rows={sortedProjects.map((p) => {
                    const key = `${p.service} / ${p.project}`;
                    return {
                      key,
                      name: p.project,
                      hint: p.service,
                      completed: p.completed,
                      total: p.total,
                      color: getProjectColor(p.project, p.service, projects, areas),
                      selected: selectedProject.toLowerCase() === key.toLowerCase(),
                      onToggle: () =>
                        setSelectedProject(
                          selectedProject.toLowerCase() === key.toLowerCase() ? 'all' : key
                        ),
                    };
                  })}
                />
                <PillRow
                  label={t('reports.byTag')}
                  emptyLabel={t('reports.noTagsInPeriod')}
                  pills={tagOptions.map((tg) => ({
                    key: tg.value,
                    label: `${tg.label} ${tg.hint}`,
                    color: getTagColor(tg.value, storeAllTags),
                    selected: selectedTag === tg.value,
                    onToggle: () => setSelectedTag(selectedTag === tg.value ? 'all' : tg.value),
                  }))}
                />
              </Stack>
            </SimpleGrid>
          </Collapse>
        </Paper>
      )}

      {/* 3 · Dense task rows grouped by status */}
      {groups.map((group) => {
        if (!group.alwaysShow && group.tasks.length === 0) return null;
        const isOpen = openGroups.includes(group.key);
        return (
          <Paper key={group.key} withBorder radius="md" style={{ overflow: 'hidden' }}>
            <UnstyledButton
              className="pbd-group-head"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isOpen}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  backgroundColor: `var(--mantine-color-${group.color}-6)`,
                }}
              />
              <Text size="sm" fw={600}>
                {group.label}
              </Text>
              <Text size="xs" c="dimmed" ff="var(--font-mono)">
                {group.tasks.length}
              </Text>
              <span className={`pbd-caret${isOpen ? ' open' : ''}`}>
                <IconChevronDown size={14} />
              </span>
            </UnstyledButton>
            <Collapse in={isOpen}>
              <Divider />
              {group.tasks.length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic" p="sm">
                  {t('reports.noTasksMatch')}
                </Text>
              ) : (
                group.tasks.map((task) => (
                  <TaskRow
                    key={task.id || task.filename}
                    task={task}
                    onOpenTask={onOpenTask}
                    openLabel={t('reports.clickToEdit')}
                    cancelledLabel={t('reports.cancelledLabel')}
                    sinceLabel={(date) => t('reports.sinceLabel', { date })}
                    dueLabel={(date) => t('reports.dueLabel', { date })}
                  />
                ))
              )}
            </Collapse>
          </Paper>
        );
      })}

      {/* Daily note checklists — collapsed by default */}
      {checklistsByDate.size > 0 && (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <UnstyledButton
            className="pbd-group-head"
            onClick={() => toggleGroup('daily_checklists')}
            aria-expanded={openGroups.includes('daily_checklists')}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-teal-6)',
              }}
            />
            <Text size="sm" fw={600}>
              {t('reports.dailyChecklistsSection')}
            </Text>
            <Text size="xs" c="dimmed" ff="var(--font-mono)">
              {dailyChecklists.filter((c) => c.completed).length}/{dailyChecklists.length}
            </Text>
            <span className={`pbd-caret${openGroups.includes('daily_checklists') ? ' open' : ''}`}>
              <IconChevronDown size={14} />
            </span>
          </UnstyledButton>
          <Collapse in={openGroups.includes('daily_checklists')}>
            <Divider />
            <Stack gap="sm" p="sm">
              {Array.from(checklistsByDate.entries()).map(([dateStr, items]) => (
                <Stack key={dateStr} gap={4}>
                  <Group gap="xs">
                    <Text size="xs" fw={600}>
                      {formatLocalizedDateTitle(dateStr, i18n.language)}
                    </Text>
                    <Text size="xs" c="dimmed" ff="var(--font-mono)">
                      {items.filter((i) => i.completed).length}/{items.length}
                    </Text>
                  </Group>
                  {items.map((item, idx) => (
                    <Group key={idx} gap="xs" wrap="nowrap" pl="xs">
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
              ))}
            </Stack>
          </Collapse>
        </Paper>
      )}
    </Stack>
  );
};

/* ------------------------------------------------------------------ */
/* Filter chip                                                         */
/* ------------------------------------------------------------------ */

interface FilterChipProps {
  label: string;
  value: string;
  displayValue?: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  allLabel: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  value,
  displayValue,
  options,
  allLabel,
  emptyLabel,
  onChange,
}) => {
  const isActive = value !== 'all';
  const shown =
    displayValue ?? (isActive ? options.find((o) => o.value === value)?.label || value : undefined);

  return (
    <Menu shadow="md" width={260} position="bottom-start" withinPortal>
      <Menu.Target>
        <UnstyledButton className={`pbd-chip${isActive ? ' active' : ''}`}>
          <Text span size="xs" fw={500} inherit>
            {label}
          </Text>
          {shown && (
            <Text span size="xs" fw={700} className="pbd-chip-val" inherit>
              {shown}
            </Text>
          )}
          <IconChevronDown size={11} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => onChange('all')} fw={value === 'all' ? 700 : 400}>
          <Text size="xs">{allLabel}</Text>
        </Menu.Item>
        {options.length === 0 ? (
          <Menu.Item disabled>
            <Text size="xs" c="dimmed">
              {emptyLabel || allLabel}
            </Text>
          </Menu.Item>
        ) : (
          <>
            <Menu.Divider />
            <ScrollArea.Autosize mah={260} type="auto">
              {options.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  onClick={() => onChange(opt.value)}
                  fw={value === opt.value ? 700 : 400}
                  rightSection={
                    opt.hint ? (
                      <Text size="xs" c="dimmed" ff="var(--font-mono)">
                        {opt.hint}
                      </Text>
                    ) : undefined
                  }
                >
                  <Text size="xs" truncate>
                    {opt.label}
                  </Text>
                </Menu.Item>
              ))}
            </ScrollArea.Autosize>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

/* ------------------------------------------------------------------ */
/* Breakdown strip internals                                           */
/* ------------------------------------------------------------------ */

interface MetricRowsProps {
  label: string;
  rows: Array<{
    key: string;
    name: string;
    hint?: string;
    completed: number;
    total: number;
    color: string;
    selected: boolean;
    onToggle: () => void;
  }>;
}

const MetricRows: React.FC<MetricRowsProps> = ({ label, rows }) => {
  if (rows.length === 0) return null;
  return (
    <Stack gap={2}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      {rows.map((row) => {
        const pct = Math.round((row.completed / (row.total || 1)) * 100);
        return (
          <UnstyledButton
            key={row.key}
            className={`pbd-brow${row.selected ? ' active' : ''}`}
            onClick={row.onToggle}
            aria-pressed={row.selected}
          >
            <Text size="xs" truncate>
              {row.name}
              {row.hint && (
                <Text span size="xs" c="dimmed" inherit>
                  {' · '}
                  {row.hint}
                </Text>
              )}
            </Text>
            <Progress value={pct} size={4} radius="xl" color={pct === 100 ? 'teal' : row.color} />
            <Text size="xs" c="dimmed" ta="right" ff="var(--font-mono)">
              {row.completed}/{row.total}
            </Text>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
};

interface PillRowProps {
  label: string;
  emptyLabel?: string;
  pills: Array<{
    key: string;
    label: string;
    color: string;
    selected: boolean;
    onToggle: () => void;
  }>;
}

const PillRow: React.FC<PillRowProps> = ({ label, emptyLabel, pills }) => (
  <Stack gap={4} mt="xs">
    <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
      {label}
    </Text>
    {pills.length === 0 ? (
      <Text size="xs" c="dimmed">
        {emptyLabel}
      </Text>
    ) : (
      <Group gap={6} wrap="wrap">
        {pills.map((pill) => (
          <UnstyledButton
            key={pill.key}
            onClick={pill.onToggle}
            aria-pressed={pill.selected}
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              padding: '2px 7px',
              borderRadius: 5,
              border: `1px solid ${
                pill.selected
                  ? `var(--mantine-color-${pill.color}-6)`
                  : 'var(--app-subtle-border)'
              }`,
              backgroundColor: pill.selected
                ? `var(--mantine-color-${pill.color}-light)`
                : 'transparent',
              color: pill.selected
                ? `var(--mantine-color-${pill.color}-filled)`
                : 'var(--app-text-secondary)',
            }}
          >
            {pill.label}
          </UnstyledButton>
        ))}
      </Group>
    )}
  </Stack>
);

/* ------------------------------------------------------------------ */
/* Task row                                                            */
/* ------------------------------------------------------------------ */

interface TaskRowProps {
  task: TaskMeta;
  onOpenTask: (task: TaskMeta) => void;
  openLabel: string;
  cancelledLabel: string;
  sinceLabel: (date: string) => string;
  dueLabel: (date: string) => string;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onOpenTask,
  openLabel,
  cancelledLabel,
  sinceLabel,
  dueLabel,
}) => {
  const isCancelled = task.status === 'cancelled';
  const isDone = task.status === 'done' || isCancelled || !!task.completedDate;
  const stripe = task.priority ? PRIORITY_STRIPE[task.priority] : 'transparent';
  const checklistPct =
    task.checklistTotal && task.checklistTotal > 0
      ? Math.round(((task.checklistCompleted || 0) / task.checklistTotal) * 100)
      : null;

  const open = () => onOpenTask(task);

  return (
    <div
      className="pbd-row"
      style={{ borderLeftColor: stripe }}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <Text size="xs" c="dimmed" ff="var(--font-mono)">
        #{task.taskId ?? task.id}
      </Text>

      <Text
        size="sm"
        truncate
        style={{
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--mantine-color-dimmed)' : undefined,
        }}
      >
        {task.title}
      </Text>

      <Group gap={10} wrap="nowrap" justify="flex-end">
        {checklistPct !== null && (
          <Group gap={5} wrap="nowrap">
            <Progress value={checklistPct} size={4} radius="xl" color="teal" w={34} />
            <Text size="xs" c="dimmed" ff="var(--font-mono)">
              {task.checklistCompleted || 0}/{task.checklistTotal}
            </Text>
          </Group>
        )}
        {(task.tags || []).slice(0, 2).map((tag) => (
          <Text key={tag} size="xs" c="dimmed" ff="var(--font-mono)" visibleFrom="md">
            #{tag}
          </Text>
        ))}
        {isCancelled && (
          <Text size="xs" c="red.6">
            {cancelledLabel}
          </Text>
        )}
        {task.completedDate && !isCancelled && (
          <Text size="xs" c="dimmed">
            {task.completedDate}
          </Text>
        )}
        {!task.completedDate && task.startedDate && (
          <Text size="xs" c="dimmed">
            {sinceLabel(task.startedDate)}
          </Text>
        )}
        {!task.completedDate && !task.startedDate && task.due && (
          <Text size="xs" c="dimmed">
            {dueLabel(task.due)}
          </Text>
        )}
        <Tooltip label={openLabel} withArrow>
          <ActionIcon
            className="pbd-row-edit"
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <IconEdit size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
};
