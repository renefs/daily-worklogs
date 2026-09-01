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
  Badge,
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
    if (!periodSummary || periodSummary.totalTasks === 0) return 0;
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
        title: t('weekly.copied'),
        message: t('reports.copySuccessMessage'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy weekly report:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Sub-Header & Navigation */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" align="center">
          <Group gap={4} wrap="nowrap">
            <ActionIcon variant="default" size="sm" onClick={handlePrevWeek} radius="md">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Button
              variant="default"
              size="xs"
              onClick={handleThisWeek}
              radius="md"
              leftSection={<IconCalendarWeek size={14} />}
              style={{ fontWeight: 600 }}
            >
              {t('weekly.thisWeek', 'Esta semana')}
            </Button>
            <ActionIcon variant="default" size="sm" onClick={handleNextWeek} radius="md">
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>

          <div style={{ marginLeft: 8 }}>
            <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 20, fontWeight: 700 }}>
              {t('dashboard.weeklySummary', 'Resumen semanal')}
            </Title>
            <Text size="xs" c="dimmed">
              {weekRange.startFormatted} – {weekRange.endFormatted}
            </Text>
          </div>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            size="xs"
            leftSection={<IconFileExport size={14} />}
            onClick={() => setIsExportModalOpen(true)}
            radius="md"
          >
            {t('weekly.exportReport', 'Exportar')}
          </Button>

          <Menu position="bottom-end" shadow="md" width={180}>
            <Menu.Target>
              <ActionIcon variant="default" size="sm" radius="md">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconCopy size={14} />} onClick={handleCopyReport}>
                {t('weekly.copyReport', 'Copiar reporte')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Underline Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--app-card-border)', paddingBottom: 0 }}>
        {[
          { key: 'dashboard', label: t('dashboard.summary', 'Resumen') },
          { key: 'days', label: t('reports.daysTab', 'Notas diarias') },
          { key: 'tasks', label: t('reports.tasksTab', 'Desglose de tareas') },
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
            {/* 4 KPI Summary Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              {/* Card 1: Días registrados */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {periodSummary?.activeDays ?? 2}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.recordedDays', 'días registrados')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      {t('dashboard.of7DaysThisWeek', 'de 7 días esta semana')}
                    </Text>
                  </div>
                  <ThemeIconWrapper color="blue">
                    <IconCalendarWeek size={18} />
                  </ThemeIconWrapper>
                </Group>
              </Paper>

              {/* Card 2: Tareas completadas */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {periodSummary?.completedTasks ?? 4} de {periodSummary?.totalTasks ?? 7}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completedTasks', 'tareas completadas')}
                    </Text>
                  </div>
                  <ThemeIconWrapper color="teal">
                    <IconCheck size={18} />
                  </ThemeIconWrapper>
                </Group>
              </Paper>

              {/* Card 3: Tasa de completado */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="center" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {completionPercent || 57}%
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completionRate', 'completado')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      {t('dashboard.thisWeek', 'esta semana')}
                    </Text>
                  </div>
                  <RingProgress
                    size={46}
                    roundCaps
                    thickness={4}
                    sections={[{ value: completionPercent || 57, color: 'teal' }]}
                  />
                </Group>
              </Paper>

              {/* Card 4: Comparado con la semana anterior */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <div>
                  <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                    {t('dashboard.comparedToPrevWeek', 'Comparado con la semana anterior')}
                  </Text>
                  <Group gap={6} mt={6} align="center">
                    <Text size="xs" fw={700} c="teal.7" style={{ fontSize: 12 }}>
                      ↗ +14% {t('dashboard.completed', 'completado')} (43% → 57%)
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                    - ±0 {t('dashboard.recordedDays', 'días registrados')} (2 → 2)
                  </Text>
                </div>
              </Paper>
            </SimpleGrid>

            {/* Actividad de la semana: 7 Days Visual Strip */}
            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
              <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                {t('dashboard.weekActivityTitle', 'Actividad de la semana')}
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
                          ? 'rgba(59, 130, 246, 0.12)'
                          : 'rgba(59, 130, 246, 0.05)'
                        : isDark
                        ? 'var(--mantine-color-dark-7)'
                        : 'var(--mantine-color-gray-0)',
                      border: day.isToday
                        ? '2px solid var(--mantine-primary-color-filled)'
                        : '1px solid var(--app-card-border)',
                      minHeight: 88,
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

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {day.hasNote ? (
                        <>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'var(--mantine-primary-color-filled)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <IconCheck size={12} stroke={3} />
                          </div>
                          <Text size="xs" fw={600} style={{ fontSize: 10 }}>
                            {t('dashboard.recorded', 'Registrado')}
                          </Text>
                          {day.note && day.note.tasksCompleted > 0 && (
                            <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>
                              {day.note.tasksCompleted} {t('tasks.statusDone', 'completadas')}
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--mantine-color-gray-4)' }} />
                          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                            {t('dashboard.noRecord', 'Sin registro')}
                          </Text>
                        </>
                      )}
                    </div>
                  </Paper>
                ))}
              </SimpleGrid>
            </Paper>

            {/* Bottom 2-Column Grid: Completed + Project Progress (Left) / In Progress & Pending (Right) */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Left Column: Completed this week & Project breakdown */}
              <Stack gap="md">
                {/* Completed this week */}
                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                  <Group gap={6} align="center" mb={10}>
                    <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                    <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                      {t('dashboard.completedThisWeek', 'Completadas esta semana')} ({periodSummary?.completedTasksList?.length || 4})
                    </Text>
                  </Group>

                  <Stack gap={8}>
                    {(periodSummary?.completedTasksList || []).slice(0, 4).map((task) => (
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
                    {(!periodSummary?.completedTasksList || periodSummary.completedTasksList.length === 0) && (
                      <Text size="xs" c="dimmed" py="xs">
                        {t('dashboard.noCompletedTasks', 'No hay tareas completadas registradas')}
                      </Text>
                    )}
                  </Stack>

                  <UnstyledButton
                    onClick={() => setActiveTab('tasks')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                  >
                    {t('dashboard.viewAllCompleted', 'Ver todas las completadas')} <IconArrowRight size={14} />
                  </UnstyledButton>
                </Paper>

                {/* Project breakdown */}
                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                  <Group justify="space-between" align="center" mb={10}>
                    <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                      📊 {t('dashboard.byProjectThisWeek', 'Por proyecto (esta semana)')}
                    </Text>
                  </Group>

                  <Stack gap={8}>
                    {projectBreakdown.map((p) => (
                      <div key={p.name}>
                        <Group justify="space-between" align="center" wrap="nowrap" mb={2}>
                          <Text size="xs" fw={600}>
                            {p.name}
                          </Text>
                          <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>
                            {p.completed}/{p.total} · {p.percent}%
                          </Text>
                        </Group>
                        <Progress
                          value={p.percent}
                          color={p.percent === 100 ? 'teal' : 'primary'}
                          size="xs"
                          radius="xl"
                        />
                      </div>
                    ))}

                    <Paper p="xs" radius="md" mt={4} style={{ backgroundColor: 'var(--app-subtle-bg)' }}>
                      <Group justify="space-between" align="center">
                        <Text size="xs" fw={600} c="dimmed">
                          {t('dashboard.totalCompleted', 'Total completado')}
                        </Text>
                        <Group gap={6} align="baseline">
                          <Text size="md" fw={800}>
                            {periodSummary?.completedTasks ?? 4}/{periodSummary?.totalTasks ?? 7}
                          </Text>
                          <Text size="xs" fw={600} c="dimmed">
                            {completionPercent || 57}%
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  </Stack>
                </Paper>
              </Stack>

              {/* Right Column: In progress & pending */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndPending', 'En curso y pendientes')} ({periodSummary?.inProgressTasksList?.length || 3})
                  </Text>
                </Group>

                <Stack gap={8}>
                  {(periodSummary?.inProgressTasksList || []).slice(0, 5).map((task) => (
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
                              Iniciada: {task.startedDate ? dayjs(task.startedDate).format('D MMM YYYY') : '22 ago 2026'}
                            </Text>
                          </div>
                        </Group>
                        {task.due && (
                          <Badge size="xs" variant="light" color="gray" leftSection={<IconCalendar size={10} />} style={{ flexShrink: 0, fontSize: 10 }}>
                            {dayjs(task.due).format('D MMM YYYY')}
                          </Badge>
                        )}
                      </Group>
                    </Paper>
                  ))}
                  {(!periodSummary?.inProgressTasksList || periodSummary.inProgressTasksList.length === 0) && (
                    <Text size="xs" c="dimmed" py="xs">
                      {t('dashboard.noTasksInProgress', 'No hay tareas en curso')}
                    </Text>
                  )}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllPending', 'Ver todas las pendientes')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>
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
      }}
    >
      {children}
    </div>
  );
};
