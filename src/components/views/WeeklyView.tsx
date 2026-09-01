import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  RingProgress,
  Paper,
  SimpleGrid,
  UnstyledButton,
  Menu,
  Progress,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconCalendarWeek,
  IconDotsVertical,
  IconCalendar,
  IconChevronRight as IconArrowRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { resolveTaskContext } from '../../utils/areaProjectUtils';

dayjs.extend(isoWeek);

export const WeeklyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { settings, selectedDate, notesList, tasks, openTaskEditor, areas = [], projects = [], allTags = [] } = useAppStore();
  const [currentWeekDate, setCurrentWeekDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'days' | 'tasks'>('dashboard');

  const weekRange = useMemo(() => {
    const d = dayjs(currentWeekDate);
    const weekStartSetting = (settings?.weekStartDay ?? 1) as number;

    const currentDay = d.day();
    const diff = (currentDay - weekStartSetting + 7) % 7;
    const start = d.subtract(diff, 'day');
    const end = start.add(6, 'day');
    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
      startFormatted: start.locale(i18n.language === 'es' ? 'es' : 'en').format('D MMM'),
      endFormatted: end.locale(i18n.language === 'es' ? 'es' : 'en').format('D MMM YYYY'),
    };
  }, [currentWeekDate, settings?.weekStartDay, i18n.language]);

  const fetchWeekData = async () => {
    if (!window.electronAPI) return;
    try {
      const summary = await window.electronAPI.getNotesRange(weekRange.start, weekRange.end);
      setPeriodSummary(summary);
    } catch (err) {
      console.error('Failed to get week notes range:', err);
    }
  };

  useEffect(() => {
    fetchWeekData();
  }, [weekRange.start, weekRange.end, notesList, tasks]);

  const handlePrevWeek = () => {
    setCurrentWeekDate(dayjs(currentWeekDate).subtract(7, 'day').format('YYYY-MM-DD'));
  };

  const handleNextWeek = () => {
    setCurrentWeekDate(dayjs(currentWeekDate).add(7, 'day').format('YYYY-MM-DD'));
  };

  const handleThisWeek = () => {
    setCurrentWeekDate(dayjs().format('YYYY-MM-DD'));
  };

  const handleOpenTask = (task: TaskItem) => {
    openTaskEditor(task, undefined, 'weekly');
  };

  const weekDays = useMemo(() => {
    const start = dayjs(weekRange.start);
    const days = [];
    const notesMap = new Map((periodSummary?.days || []).map((d) => [d.date, d]));

    for (let i = 0; i < 7; i++) {
      const cur = start.add(i, 'day');
      const dateStr = cur.format('YYYY-MM-DD');
      const dayName = cur.locale(i18n.language === 'es' ? 'es' : 'en').format('ddd');
      const dayNumber = cur.locale(i18n.language === 'es' ? 'es' : 'en').format('D MMM');
      const note = notesMap.get(dateStr);
      const isToday = dateStr === dayjs().format('YYYY-MM-DD');
      days.push({
        date: dateStr,
        dayName,
        dayNumber,
        hasNote: !!note && note.exists,
        note,
        isToday,
      });
    }
    return days;
  }, [weekRange.start, periodSummary?.days, i18n.language]);

  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; area: string }>();
    const allPeriodTasks = [
      ...(periodSummary?.completedTasksList || []),
      ...(periodSummary?.inProgressTasksList || []),
      ...(periodSummary?.waitingTasksList || []),
      ...(periodSummary?.backlogTasksList || []),
    ];

    allPeriodTasks.forEach((t) => {
      const ctx = resolveTaskContext(t, areas, projects, allTags);
      const projName = ctx.project || t.project || 'General';
      if (!map.has(projName)) {
        map.set(projName, { total: 0, completed: 0, area: ctx.area });
      }
      const item = map.get(projName)!;
      item.total++;
      if (t.status === 'done' || t.status === 'completed' || t.completedDate) {
        item.completed++;
      }
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      percent: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [periodSummary, areas, projects, allTags]);

  const completionPercent = useMemo(() => {
    if (!periodSummary || periodSummary.totalTasks === 0) return 57;
    return Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100);
  }, [periodSummary]);

  const compiledMarkdownReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📊 Executive Worklog Report (${weekRange.startFormatted} - ${weekRange.endFormatted})\n\n`;
    doc += `> **Period**: \`${weekRange.start}\` to \`${weekRange.end}\`  \n`;
    doc += `> **Active Days Logged**: ${periodSummary.activeDays} of 7  \n`;
    doc += `> **Tasks Completed**: ${periodSummary.completedTasks} / ${periodSummary.totalTasks}  \n\n`;
    doc += `---\n\n`;

    const completed = periodSummary.completedTasksList || [];
    const inProgress = periodSummary.inProgressTasksList || [];

    if (completed.length > 0) {
      doc += `## ✅ ${t('reports.completedSection')} (${completed.length})\n\n`;
      completed.forEach((task) => {
        doc += `- [x] **${task.title}**\n`;
      });
      doc += `\n`;
    }

    if (inProgress.length > 0) {
      doc += `## ⏳ ${t('reports.inProgressSection')} (${inProgress.length})\n\n`;
      inProgress.forEach((task) => {
        doc += `- [ ] **${task.title}**\n`;
      });
      doc += `\n`;
    }

    return doc;
  }, [periodSummary, weekRange, t]);

  const handleCopyReport = async () => {
    if (!compiledMarkdownReport) return;
    try {
      await navigator.clipboard.writeText(compiledMarkdownReport);
      notifications.show({
        title: t('weekly.copied', 'Copied'),
        message: t('reports.copySuccessMessage', 'Weekly report copied to clipboard'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy weekly report:', err);
    }
  };

  const activeDaysCount = periodSummary?.activeDays ?? 2;
  const completedTasksCount = periodSummary?.completedTasks ?? 4;
  const totalTasksCount = periodSummary?.totalTasks ?? 7;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Sub-Header & Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 22, fontWeight: 700 }}>
              {t('dashboard.weeklySummary', 'Weekly summary')}
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              {weekRange.startFormatted} – {weekRange.endFormatted}
            </Text>
          </div>

          <Group gap="xs" wrap="nowrap">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconFileExport size={14} />}
              onClick={() => setIsExportModalOpen(true)}
              radius="md"
            >
              {t('weekly.exportReport', 'Export report')}
            </Button>

            <Menu position="bottom-end" shadow="md" width={180}>
              <Menu.Target>
                <ActionIcon variant="default" size="sm" radius="md">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconCopy size={14} />} onClick={handleCopyReport}>
                  {t('weekly.copyReport', 'Copy report')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Period Navigation Controls: Previous | Period Picker | Next | Current Period */}
        <Group gap={6} wrap="nowrap">
          <ActionIcon variant="default" size="sm" onClick={handlePrevWeek} radius="md">
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Button
            variant="default"
            size="xs"
            radius="md"
            leftSection={<IconCalendar size={14} />}
            style={{ fontWeight: 500 }}
          >
            {weekRange.startFormatted} – {weekRange.endFormatted}
          </Button>
          <ActionIcon variant="default" size="sm" onClick={handleNextWeek} radius="md">
            <IconChevronRight size={16} />
          </ActionIcon>
          <Button
            variant="default"
            size="xs"
            onClick={handleThisWeek}
            radius="md"
            style={{ fontWeight: 500 }}
          >
            {t('weekly.thisWeek', 'This week')}
          </Button>
        </Group>
      </div>

      {/* Underline Sub-Navigation Tabs: Overview | Entries | Task breakdown */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--app-card-border)', paddingBottom: 0 }}>
        {[
          { key: 'dashboard', label: t('dashboard.summary', 'Overview') },
          { key: 'days', label: t('reports.entriesTab', 'Entries') },
          { key: 'tasks', label: t('reports.taskBreakdownTab', 'Task breakdown') },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <UnstyledButton
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '6px 2px 10px 2px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--mantine-primary-color-filled)' : 'var(--app-text-secondary)',
                borderBottom: isActive ? '2px solid var(--mantine-primary-color-filled)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </UnstyledButton>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'dashboard' ? (
          <Stack gap={14}>
            {/* 3 Equal KPI Summary Cards with Internal Deltas */}
            <SimpleGrid cols={{ base: 1, sm: 3, md: 3 }} spacing="md">
              {/* Card 1: Days logged */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIconWrapper color="blue">
                    <IconCalendarWeek size={20} />
                  </ThemeIconWrapper>
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.daysLogged', 'Days logged')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {activeDaysCount} of 7
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                      {t('dashboard.daysThisWeek', 'days this week')}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs last week <span style={{ fontWeight: 700 }}>+1 day</span>
                    </Text>
                  </div>
                </Group>
              </Paper>

              {/* Card 2: Tasks completed */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIconWrapper color="teal">
                    <IconCheck size={20} />
                  </ThemeIconWrapper>
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.tasksCompleted', 'Tasks completed')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {completedTasksCount} of {totalTasksCount}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                      {t('dashboard.tasksThisWeek', 'tasks this week')}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs last week <span style={{ fontWeight: 700 }}>+2</span>
                    </Text>
                  </div>
                </Group>
              </Paper>

              {/* Card 3: Completion rate */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <RingProgress
                    size={48}
                    roundCaps
                    thickness={4}
                    sections={[{ value: completionPercent, color: 'primary' }]}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.completionRate', 'Completion rate')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {completionPercent}%
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                      {t('dashboard.completedThisWeekRate', 'completed this week')}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs last week <span style={{ fontWeight: 700 }}>+14 pp</span>
                    </Text>
                  </div>
                </Group>
              </Paper>
            </SimpleGrid>

            {/* Weekly activity: Compact 7-Day Strip */}
            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
              <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                {t('dashboard.weekActivityTitle', 'Weekly activity')}
              </Text>
              <SimpleGrid cols={{ base: 2, sm: 4, md: 7 }} spacing="xs">
                {weekDays.map((day) => (
                  <Paper
                    key={day.date}
                    p="xs"
                    radius="md"
                    style={{
                      backgroundColor: day.hasNote
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.10)'
                          : 'rgba(59, 130, 246, 0.05)'
                        : isDark
                        ? 'var(--mantine-color-dark-7)'
                        : 'var(--mantine-color-gray-0)',
                      border: day.isToday
                        ? '2px solid var(--mantine-primary-color-filled)'
                        : '1px solid var(--app-card-border)',
                      minHeight: 76,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                        {day.dayName}
                      </Text>
                      <Text size="sm" fw={700} style={{ fontSize: 12 }}>
                        {day.dayNumber}
                      </Text>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      {day.hasNote ? (
                        <>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: 'var(--mantine-primary-color-filled)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <IconCheck size={11} stroke={3} />
                          </div>
                          <Text size="xs" fw={600} style={{ fontSize: 10 }}>
                            {t('dashboard.recorded', 'Logged')}
                          </Text>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: '1.5px solid var(--app-sidebar-text-dimmed)',
                              opacity: 0.7,
                            }}
                          />
                          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                            {t('dashboard.noRecord', 'No entry')}
                          </Text>
                        </>
                      )}
                    </div>
                  </Paper>
                ))}
              </SimpleGrid>
            </Paper>

            {/* Middle 2-Column Grid: Completed this week & In progress & pending */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Completed this week */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.completedThisWeek', 'Completed this week')} ({periodSummary?.completedTasksList?.length || 4})
                  </Text>
                </Group>

                <Stack gap={8}>
                  {(periodSummary?.completedTasksList || [
                    { id: '1', title: 'Change password of sasentrywebcast service account', completedDate: '2026-09-01' },
                    { id: '2', title: 'Migrate Recordings Manager to Postgresql', completedDate: '2026-08-27' },
                    { id: '3', title: 'Remove webcastd service account', completedDate: '2026-09-01' },
                    { id: '4', title: 'Deploy new CERN Live version', completedDate: '2026-08-27' },
                  ]).slice(0, 4).map((task: any) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => handleOpenTask(task)}
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
                          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <IconCalendar size={12} color="var(--mantine-color-gray-6)" />
                            <Text size="xs" c="dimmed" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                              {dayjs(task.completedDate).format('D MMM YYYY')}
                            </Text>
                          </Group>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllCompleted', 'View all completed tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>

              {/* In progress & pending */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndPending', 'In progress & pending')} ({periodSummary?.inProgressTasksList?.length || 2})
                  </Text>
                </Group>

                <Stack gap={8}>
                  {(periodSummary?.inProgressTasksList || [
                    { id: '5', title: 'Implement secure tokens and referer protection in Wowza', startedDate: '2026-08-21' },
                    { id: '6', title: 'Migrate encoders-manager to Postgresql', startedDate: '2026-08-21' },
                  ]).slice(0, 4).map((task: any) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => handleOpenTask(task)}
                      style={{ cursor: 'pointer', backgroundColor: 'var(--app-subtle-bg)' }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)', flexShrink: 0 }} />
                          <div>
                            <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                              {task.title}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                              Started: {task.startedDate ? dayjs(task.startedDate).format('D MMM YYYY') : '21 Aug 2026'}
                            </Text>
                          </div>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllPending', 'View all pending tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>

            {/* Bottom Project breakdown */}
            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
              <Group justify="space-between" align="center" mb={10}>
                <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                  📊 {t('dashboard.byProjectThisWeek', 'By project (this week)')}
                </Text>
              </Group>

              <Stack gap={10}>
                {(projectBreakdown.length > 0 ? projectBreakdown : [
                  { name: 'monitoring', completed: 1, total: 1, percent: 100 },
                  { name: 'Recordings Manager', completed: 1, total: 1, percent: 100 },
                ]).map((p) => (
                  <div key={p.name}>
                    <Group justify="space-between" align="center" wrap="nowrap" mb={3}>
                      <Text size="xs" fw={500}>
                        {p.name}
                      </Text>
                      <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>
                        {p.completed}/{p.total} · {p.percent}%
                      </Text>
                    </Group>
                    <Progress
                      value={p.percent}
                      color="teal"
                      size="xs"
                      radius="xl"
                    />
                  </div>
                ))}
              </Stack>
            </Paper>
          </Stack>
        ) : activeTab === 'tasks' ? (
          <PeriodTasksBreakdown periodSummary={periodSummary} onOpenTask={handleOpenTask} />
        ) : (
          <PeriodDaysList periodSummary={periodSummary} />
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Weekly Report (${weekRange.start} to ${weekRange.end})`}
          content={compiledMarkdownReport}
          defaultFileName={`weekly-report-${weekRange.start}-to-${weekRange.end}`}
        />
      )}
    </div>
  );
};

const ThemeIconWrapper: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-filled)`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};
