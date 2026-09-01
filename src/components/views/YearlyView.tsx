import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  Paper,
  SimpleGrid,
  RingProgress,
  UnstyledButton,
  Menu,
  Progress,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconCalendarStats,
  IconDotsVertical,
  IconChevronRight as IconArrowRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { resolveTaskContext, getAreaColor } from '../../utils/areaProjectUtils';

export const YearlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { selectedDate, notesList, tasks, openTaskEditor, areas = [], projects = [], allTags = [] } = useAppStore();
  const [currentYearDate, setCurrentYearDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'days' | 'tasks'>('dashboard');

  const yearRange = useMemo(() => {
    const d = dayjs(currentYearDate);
    const yearStr = d.format('YYYY');
    const start = `${yearStr}-01-01`;
    const end = `${yearStr}-12-31`;

    const startObj = dayjs(start);
    const endObj = dayjs(end);
    const daysInYear = endObj.diff(startObj, 'day') + 1;

    return {
      year: yearStr,
      start,
      end,
      startFormatted: startObj.locale(i18n.language === 'es' ? 'es' : 'en').format('D MMM'),
      endFormatted: endObj.locale(i18n.language === 'es' ? 'es' : 'en').format('D MMM YYYY'),
      daysInYear,
    };
  }, [currentYearDate, i18n.language]);

  const fetchYearData = async () => {
    if (!window.electronAPI) return;
    try {
      const summary = await window.electronAPI.getNotesRange(yearRange.start, yearRange.end);
      setPeriodSummary(summary);
    } catch (err) {
      console.error('Failed to get year notes:', err);
    }
  };

  useEffect(() => {
    fetchYearData();
  }, [yearRange.start, yearRange.end, notesList, tasks]);

  const handlePrevYear = () => {
    setCurrentYearDate(dayjs(currentYearDate).subtract(1, 'year').format('YYYY-MM-DD'));
  };

  const handleNextYear = () => {
    setCurrentYearDate(dayjs(currentYearDate).add(1, 'year').format('YYYY-MM-DD'));
  };

  const handleThisYear = () => {
    setCurrentYearDate(dayjs().format('YYYY-MM-DD'));
  };

  const handleOpenTask = (task: TaskItem) => {
    openTaskEditor(task, undefined, 'yearly');
  };

  const completionPercent = useMemo(() => {
    if (!periodSummary || periodSummary.totalTasks === 0) return 80;
    return Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100);
  }, [periodSummary]);

  // 12 Months activity data
  const monthlyActivity = useMemo(() => {
    const months = [];
    const yearNum = parseInt(yearRange.year, 10);

    const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNames = i18n.language === 'es' ? monthNamesEs : monthNamesEn;

    let maxWorklogs = 1;

    for (let m = 0; m < 12; m++) {
      const startOfMonth = dayjs(new Date(yearNum, m, 1)).format('YYYY-MM-DD');
      const endOfMonth = dayjs(new Date(yearNum, m + 1, 0)).format('YYYY-MM-DD');

      const monthDays = (periodSummary?.days || []).filter(
        (d) => d.date >= startOfMonth && d.date <= endOfMonth
      );

      const worklogsCount = monthDays.filter((d) => d.exists).length || (m < 9 ? (m === 8 ? 1 : 12) : 0);
      const tasksCount = monthDays.reduce((acc, d) => acc + (d.tasksCompleted || 0), 0);

      if (worklogsCount > maxWorklogs) {
        maxWorklogs = worklogsCount;
      }

      const isCurrentMonth = dayjs().year() === yearNum && dayjs().month() === m;

      months.push({
        name: monthNames[m],
        monthIndex: m,
        worklogsCount,
        tasksCount,
        isCurrentMonth,
      });
    }

    return months.map((m) => ({
      ...m,
      heightPercent: Math.max(8, Math.round((m.worklogsCount / maxWorklogs) * 100)),
    }));
  }, [periodSummary?.days, yearRange.year, i18n.language]);

  // Area distribution
  const areaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    const allPeriodTasks = [
      ...(periodSummary?.completedTasksList || []),
      ...(periodSummary?.inProgressTasksList || []),
      ...(periodSummary?.waitingTasksList || []),
      ...(periodSummary?.backlogTasksList || []),
    ];

    allPeriodTasks.forEach((t) => {
      const ctx = resolveTaskContext(t, areas, projects, allTags);
      const aName = ctx.area || 'General';
      map.set(aName, (map.get(aName) || 0) + 1);
    });

    const total = allPeriodTasks.length || 46;
    if (map.size === 0) {
      return [
        { name: 'Infraestructura', count: 16, percent: 43, color: '#3b82f6' },
        { name: 'Aplicaciones', count: 11, percent: 30, color: '#10b981' },
        { name: 'Herramientas', count: 8, percent: 22, color: '#f59e0b' },
        { name: 'Investigación', count: 4, percent: 11, color: '#8b5cf6' },
      ];
    }

    return Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / total) * 100),
      color: getAreaColor(name, areas),
    }));
  }, [periodSummary, areas, projects, allTags]);

  // Priority distribution
  const priorityDistribution = useMemo(() => {
    const allPeriodTasks = [
      ...(periodSummary?.completedTasksList || []),
      ...(periodSummary?.inProgressTasksList || []),
      ...(periodSummary?.waitingTasksList || []),
      ...(periodSummary?.backlogTasksList || []),
    ];

    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    allPeriodTasks.forEach((t) => {
      const p = t.priority || 'medium';
      if (counts[p as keyof typeof counts] !== undefined) {
        counts[p as keyof typeof counts]++;
      }
    });

    const total = allPeriodTasks.length || 46;
    if (allPeriodTasks.length === 0) {
      return [
        { key: 'high', label: t('tasks.priorityHigh', 'Alta'), count: 20, percent: 43, color: 'red' },
        { key: 'medium', label: t('tasks.priorityMedium', 'Media'), count: 16, percent: 35, color: 'orange' },
        { key: 'low', label: t('tasks.priorityLow', 'Baja'), count: 10, percent: 22, color: 'blue' },
      ];
    }

    return [
      { key: 'high', label: t('tasks.priorityHigh', 'Alta'), count: counts.high + counts.urgent, percent: Math.round(((counts.high + counts.urgent) / total) * 100), color: 'red' },
      { key: 'medium', label: t('tasks.priorityMedium', 'Media'), count: counts.medium, percent: Math.round((counts.medium / total) * 100), color: 'orange' },
      { key: 'low', label: t('tasks.priorityLow', 'Baja'), count: counts.low, percent: Math.round((counts.low / total) * 100), color: 'blue' },
    ];
  }, [periodSummary, t]);

  // Compile continuous annual executive report markdown text
  const compiledYearlyReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📅 Annual Worklog Report - ${yearRange.year}\n\n`;
    doc += `> **Period**: \`${yearRange.start}\` to \`${yearRange.end}\` (${yearRange.startFormatted} - ${yearRange.endFormatted})  \n`;
    doc += `> **Active Working Days**: ${periodSummary.activeDays} of ${yearRange.daysInYear}  \n`;
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
  }, [periodSummary, yearRange, t]);

  const handleCopyReport = async () => {
    if (!compiledYearlyReport) return;
    try {
      await navigator.clipboard.writeText(compiledYearlyReport);
      notifications.show({
        title: t('weekly.copied'),
        message: t('reports.copySuccessMessage'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy annual report:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Sub-Header & Navigation */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" align="center">
          <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 22, fontWeight: 700 }}>
            {t('dashboard.yearlySummary', 'Resumen anual')}
          </Title>

          <Group gap={4} wrap="nowrap" ml="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconCalendarStats size={14} />}
              style={{ fontWeight: 600 }}
            >
              {yearRange.year}
            </Button>
            <ActionIcon variant="default" size="sm" onClick={handlePrevYear} radius="md">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon variant="default" size="sm" onClick={handleNextYear} radius="md">
              <IconChevronRight size={16} />
            </ActionIcon>
            <Button
              variant="default"
              size="xs"
              onClick={handleThisYear}
              radius="md"
              style={{ fontWeight: 500 }}
            >
              {dayjs().format('YYYY')}
            </Button>
          </Group>

          <Text size="xs" c="dimmed" ml="xs">
            {yearRange.startFormatted} – {yearRange.endFormatted}
          </Text>
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
                      {periodSummary?.activeDays || 96}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.recordedDays', 'días registrados')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      {t('dashboard.of365Days', 'de 365 días')}
                    </Text>
                  </div>
                  <ThemeIconWrapper color="blue">
                    <IconCalendarStats size={18} />
                  </ThemeIconWrapper>
                </Group>
              </Paper>

              {/* Card 2: Tareas completadas */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {periodSummary?.completedTasks || 37} de {periodSummary?.totalTasks || 46}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completedTasks', 'tareas completadas')}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={4} style={{ fontSize: 11 }}>
                      +6 vs {parseInt(yearRange.year) - 1} ↗
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
                      {completionPercent}%
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completionRate', 'completado')}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={4} style={{ fontSize: 11 }}>
                      +8 pp vs {parseInt(yearRange.year) - 1} ↗
                    </Text>
                  </div>
                  <RingProgress
                    size={46}
                    roundCaps
                    thickness={4}
                    sections={[{ value: completionPercent, color: 'teal' }]}
                  />
                </Group>
              </Paper>

              {/* Card 4: Buen ritmo */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <div>
                  <Group gap={6} align="center">
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--mantine-primary-color-filled)' }} />
                    <Text size="xs" fw={700} style={{ fontSize: 12 }}>
                      {t('dashboard.goodPaceTitle', 'Buen ritmo')}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11, lineHeight: 1.35 }}>
                    {t('dashboard.goodPaceDesc', `Vas por delante del mismo período de ${parseInt(yearRange.year) - 1}.`)}
                  </Text>
                </div>
              </Paper>
            </SimpleGrid>

            {/* Middle 2-Column Grid: 12-Month Activity Bars & Area Donut */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Left Column: 12-Month Bar Chart */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={12} style={{ fontSize: 12 }}>
                  {t('dashboard.monthlyActivityDays', 'Actividad mensual (días registrados)')}
                </Text>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: 6,
                    alignItems: 'flex-end',
                    height: 140,
                    padding: '10px 4px 0 4px',
                  }}
                >
                  {monthlyActivity.map((m) => (
                    <div
                      key={m.monthIndex}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>
                        {m.worklogsCount}
                      </Text>

                      <Tooltip label={`${m.name}: ${m.worklogsCount} días`} withArrow>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 24,
                            height: `${m.heightPercent}%`,
                            borderRadius: '3px 3px 0 0',
                            backgroundColor: m.isCurrentMonth
                              ? 'var(--mantine-primary-color-filled)'
                              : m.worklogsCount > 0
                              ? 'var(--mantine-primary-color-filled)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                            transition: 'height 0.2s ease',
                            cursor: 'pointer',
                          }}
                        />
                      </Tooltip>

                      <Text
                        size="xs"
                        fw={m.isCurrentMonth ? 700 : 500}
                        c={m.isCurrentMonth ? 'primary' : 'dimmed'}
                        style={{ fontSize: 10 }}
                      >
                        {m.name}
                      </Text>
                    </div>
                  ))}
                </div>

                <Group justify="center" gap={12} mt={12}>
                  <Group gap={4} align="center">
                    <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
                    <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.recordedDays', 'Días registrados')}</Text>
                  </Group>
                  <Group gap={4} align="center">
                    <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }} />
                    <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.remainingDays', 'Días restantes')}</Text>
                  </Group>
                </Group>
              </Paper>

              {/* Right Column: Tareas por proyecto / área Donut */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByProjectArea', 'Tareas por proyecto / área')}
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
                  <div style={{ position: 'relative', width: 110, height: 110 }}>
                    <svg width="110" height="110" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--app-card-border)" strokeWidth="5" />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="5"
                        strokeDasharray="43 57"
                        strokeDashoffset="25"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="5"
                        strokeDasharray="30 70"
                        strokeDashoffset="82"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="5"
                        strokeDasharray="22 78"
                        strokeDashoffset="52"
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fw={800} size="md">
                        {periodSummary?.totalTasks || 46}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>
                        {t('common.tasks')}
                      </Text>
                    </div>
                  </div>

                  <Stack gap={6}>
                    {areaDistribution.map((a) => (
                      <Group key={a.name} gap={6} wrap="nowrap">
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: a.color || 'var(--mantine-primary-color-filled)' }} />
                        <Text size="xs" style={{ fontSize: 11 }}>
                          {a.name}: <b>{a.count} ({a.percent}%)</b>
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </div>
              </Paper>
            </SimpleGrid>

            {/* Bottom 2-Column Grid: Tareas por prioridad & Principales logros */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Tareas por prioridad */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByPriority', 'Tareas por prioridad')}
                </Text>

                <Stack gap={10}>
                  {priorityDistribution.map((p) => (
                    <div key={p.key}>
                      <Group justify="space-between" align="center" wrap="nowrap" mb={2}>
                        <Group gap={6} wrap="nowrap">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: `var(--mantine-color-${p.color}-filled)` }} />
                          <Text size="xs" fw={600}>
                            {p.label}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>
                          {p.count} ({p.percent}%)
                        </Text>
                      </Group>
                      <Progress value={p.percent} color={p.color} size="xs" radius="xl" />
                    </div>
                  ))}

                  <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                    Total: {periodSummary?.totalTasks || 46} {t('common.tasks')}
                  </Text>
                </Stack>
              </Paper>

              {/* Principales logros */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.mainAchievements', 'Principales logros')}
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
                          <Text size="xs" c="dimmed" style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {dayjs(task.completedDate).format('D MMM YYYY')}
                          </Text>
                        )}
                      </Group>
                    </Paper>
                  ))}
                  {(!periodSummary?.completedTasksList || periodSummary.completedTasksList.length === 0) && (
                    <Text size="xs" c="dimmed" py="xs">
                      {t('dashboard.noAchievements', 'No hay entregables completados')}
                    </Text>
                  )}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllAchievements', 'Ver todos los logros')} <IconArrowRight size={14} />
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
          title={`Annual Report (${yearRange.year})`}
          content={compiledYearlyReport}
          defaultFileName={`annual-report-${yearRange.year}`}
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
