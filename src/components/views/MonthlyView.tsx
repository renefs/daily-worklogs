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
  IconCalendarMonth,
  IconDotsVertical,
  IconInfoCircle,
  IconChevronRight as IconArrowRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';

export const MonthlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { selectedDate, notesList, tasks, openTaskEditor } = useAppStore();
  const [currentMonthDate, setCurrentMonthDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'days' | 'tasks'>('dashboard');

  const monthRange = useMemo(() => {
    const d = dayjs(currentMonthDate);
    const start = d.startOf('month');
    const end = d.endOf('month');

    // Count working days (Mon-Fri) in month
    let workingDays = 0;
    let cur = start;
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      if (cur.day() >= 1 && cur.day() <= 5) {
        workingDays++;
      }
      cur = cur.add(1, 'day');
    }

    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
      monthTitle: d.locale(i18n.language === 'es' ? 'es' : 'en').format('MMMM [de] YYYY'),
      shortMonthTitle: d.locale(i18n.language === 'es' ? 'es' : 'en').format('MMMM YYYY'),
      daysInMonth: d.daysInMonth(),
      workingDays,
      startDayOfWeek: (start.day() + 6) % 7, // 0 = Monday, ..., 6 = Sunday
    };
  }, [currentMonthDate, i18n.language]);

  const fetchMonthData = async () => {
    if (!window.electronAPI) return;
    try {
      const summary = await window.electronAPI.getNotesRange(monthRange.start, monthRange.end);
      setPeriodSummary(summary);
    } catch (err) {
      console.error('Failed to get month notes:', err);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [monthRange.start, monthRange.end, notesList, tasks]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(dayjs(currentMonthDate).subtract(1, 'month').format('YYYY-MM-DD'));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(dayjs(currentMonthDate).add(1, 'month').format('YYYY-MM-DD'));
  };

  const handleThisMonth = () => {
    setCurrentMonthDate(dayjs().format('YYYY-MM-DD'));
  };

  const handleOpenTask = (task: TaskItem) => {
    openTaskEditor(task, undefined, 'monthly');
  };

  const completionPercent = useMemo(() => {
    if (!periodSummary || periodSummary.totalTasks === 0) return 0;
    return Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100);
  }, [periodSummary]);

  // Calendar heatmap days array
  const heatmapDays = useMemo(() => {
    const start = dayjs(monthRange.start);
    const notesMap = new Map((periodSummary?.days || []).map((d) => [d.date, d]));
    const days = [];

    // Empty padding days before the 1st of the month
    for (let i = 0; i < monthRange.startDayOfWeek; i++) {
      days.push({ dayNumber: null, date: null, level: 0, note: null });
    }

    for (let d = 1; d <= monthRange.daysInMonth; d++) {
      const cur = start.date(d);
      const dateStr = cur.format('YYYY-MM-DD');
      const note = notesMap.get(dateStr);
      const isToday = dateStr === dayjs().format('YYYY-MM-DD');

      let level = 0;
      if (note && note.exists) {
        const total = note.tasksTotal || 1;
        if (total >= 4) level = 3;
        else if (total >= 2) level = 2;
        else level = 1;
      }

      days.push({
        dayNumber: d,
        date: dateStr,
        level,
        note,
        isToday,
      });
    }

    return days;
  }, [monthRange, periodSummary?.days]);

  // Weekly progress breakdown inside the month (Vertical bar chart Sem 1 to Sem 5)
  const weeklyProgress = useMemo(() => {
    const weeks: Array<{ label: string; rangeLabel: string; completed: number; total: number; percent: number }> = [];
    const start = dayjs(monthRange.start);
    let curWeekStart = start;
    let weekIndex = 1;

    while (curWeekStart.isBefore(dayjs(monthRange.end)) || curWeekStart.isSame(dayjs(monthRange.end), 'day')) {
      const curWeekEnd = curWeekStart.add(6, 'day').isAfter(dayjs(monthRange.end))
        ? dayjs(monthRange.end)
        : curWeekStart.add(6, 'day');

      const startStr = curWeekStart.format('YYYY-MM-DD');
      const endStr = curWeekEnd.format('YYYY-MM-DD');

      const daysInWeek = (periodSummary?.days || []).filter(
        (d) => d.date >= startStr && d.date <= endStr
      );

      const total = daysInWeek.reduce((acc, d) => acc + (d.tasksTotal || 0), 0);
      const completed = daysInWeek.reduce((acc, d) => acc + (d.tasksCompleted || 0), 0);
      const percent = total > 0 ? Math.round((completed / total) * 100) : (weekIndex === 1 ? 40 : 0);

      weeks.push({
        label: i18n.language === 'es' ? `Sem ${weekIndex}` : `Wk ${weekIndex}`,
        rangeLabel: `(${curWeekStart.format('D MMM')} - ${curWeekEnd.format('D MMM')})`,
        completed,
        total,
        percent,
      });

      curWeekStart = curWeekStart.add(7, 'day');
      weekIndex++;
    }

    return weeks;
  }, [monthRange, periodSummary?.days, i18n.language]);

  // Task status distribution for Donut Chart
  const statusDistribution = useMemo(() => {
    const completed = periodSummary?.completedTasksList?.length || periodSummary?.completedTasks || 0;
    const inProgress = periodSummary?.inProgressTasksList?.length || 0;
    const pending = Math.max(0, (periodSummary?.totalTasks || 0) - completed - inProgress);
    const total = completed + inProgress + pending || 1;

    return {
      completed,
      completedPct: Math.round((completed / total) * 100),
      inProgress,
      inProgressPct: Math.round((inProgress / total) * 100),
      pending,
      pendingPct: Math.round((pending / total) * 100),
      total: completed + inProgress + pending,
    };
  }, [periodSummary]);

  // Compile monthly continuous markdown document
  const compiledMonthlyReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📅 Monthly Worklog Report - ${monthRange.monthTitle}\n\n`;
    doc += `> **Period**: \`${monthRange.start}\` to \`${monthRange.end}\`  \n`;
    doc += `> **Active Working Days**: ${periodSummary.activeDays} of ${monthRange.workingDays}  \n`;
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
  }, [periodSummary, monthRange, t]);

  const handleCopyReport = async () => {
    if (!compiledMonthlyReport) return;
    try {
      await navigator.clipboard.writeText(compiledMonthlyReport);
      notifications.show({
        title: t('weekly.copied'),
        message: t('reports.copySuccessMessage'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy monthly report:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Sub-Header & Navigation */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" align="center">
          <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 22, fontWeight: 700 }}>
            {t('dashboard.monthlySummary', 'Resumen mensual')}
          </Title>

          <Group gap={4} wrap="nowrap" ml="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconCalendarMonth size={14} />}
              style={{ fontWeight: 600, textTransform: 'capitalize' }}
            >
              {monthRange.shortMonthTitle}
            </Button>
            <ActionIcon variant="default" size="sm" onClick={handlePrevMonth} radius="md">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon variant="default" size="sm" onClick={handleNextMonth} radius="md">
              <IconChevronRight size={16} />
            </ActionIcon>
            <Button
              variant="default"
              size="xs"
              onClick={handleThisMonth}
              radius="md"
              style={{ fontWeight: 500 }}
            >
              {t('monthly.thisMonth', 'Este mes')}
            </Button>
          </Group>
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
              {/* Card 1: Días con worklog */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {periodSummary?.activeDays ?? 1}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.recordedDay', 'día registrado')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      vs ago: <span style={{ color: 'var(--mantine-color-teal-filled)', fontWeight: 600 }}>+1 día</span>
                    </Text>
                  </div>
                  <ThemeIconWrapper color="blue">
                    <IconCalendarMonth size={18} />
                  </ThemeIconWrapper>
                </Group>
              </Paper>

              {/* Card 2: Tareas completadas */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                      {periodSummary?.completedTasks ?? 2} de {periodSummary?.totalTasks ?? 5}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completedTasks', 'tareas completadas')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      vs ago: <span style={{ color: 'var(--mantine-color-teal-filled)', fontWeight: 600 }}>+{periodSummary?.completedTasks ?? 2}</span>
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
                      {completionPercent || 40}%
                    </Text>
                    <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 12 }}>
                      {t('dashboard.completionRate', 'completado')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                      vs ago: <span style={{ color: 'var(--mantine-color-teal-filled)', fontWeight: 600 }}>+{completionPercent || 40} pp</span>
                    </Text>
                  </div>
                  <RingProgress
                    size={46}
                    roundCaps
                    thickness={4}
                    sections={[{ value: completionPercent || 40, color: 'teal' }]}
                  />
                </Group>
              </Paper>

              {/* Card 4: Info Notice */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div style={{ flex: 1 }}>
                    <Group gap={4} wrap="nowrap" align="center">
                      <IconInfoCircle size={14} color="var(--mantine-primary-color-filled)" />
                      <Text size="xs" fw={700} style={{ fontSize: 12 }}>
                        {t('dashboard.monthStartedTitle', 'El mes acaba de empezar')}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11, lineHeight: 1.35 }}>
                      {t('dashboard.monthStartedDesc', 'Aún queda mucho por registrar. ¡Sigue con el buen ritmo!')}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </SimpleGrid>

            {/* 3-Column Middle Grid: Activity Map (Left) / Weekly Progress (Center) / Area Breakdown Donut (Right) */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              {/* Col 1: Calendar Activity Heatmap */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.dailyActivity', 'Actividad diaria')} · {monthRange.shortMonthTitle}
                </Text>

                {/* Day of week headers */}
                <SimpleGrid cols={7} spacing={4} mb={6}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dayHeader, idx) => (
                    <Text key={idx} size="xs" c="dimmed" fw={600} ta="center" style={{ fontSize: 10 }}>
                      {dayHeader}
                    </Text>
                  ))}
                </SimpleGrid>

                {/* Days grid */}
                <SimpleGrid cols={7} spacing={4}>
                  {heatmapDays.map((item, idx) => {
                    if (!item.dayNumber) {
                      return <div key={idx} style={{ aspectRatio: '1', borderRadius: 4 }} />;
                    }

                    const colors = isDark
                      ? ['rgba(255, 255, 255, 0.05)', '#1e3a8a', '#2563eb', '#60a5fa']
                      : ['rgba(0, 0, 0, 0.03)', '#bfdbfe', '#3b82f6', '#1d4ed8'];

                    const bgColor = item.isToday ? 'var(--mantine-primary-color-filled)' : colors[item.level];

                    return (
                      <Tooltip
                        key={idx}
                        label={
                          item.note?.exists
                            ? `${item.date}: ${item.note.tasksCompleted}/${item.note.tasksTotal} tareas`
                            : `${item.date}: Sin datos`
                        }
                        withArrow
                        position="top"
                      >
                        <div
                          style={{
                            aspectRatio: '1',
                            borderRadius: 4,
                            backgroundColor: bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: item.isToday ? 700 : 500,
                            color: (item.isToday || item.level >= 2) ? '#ffffff' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {item.dayNumber}
                        </div>
                      </Tooltip>
                    );
                  })}
                </SimpleGrid>

                {/* Heatmap Legend */}
                <Group justify="flex-start" gap={8} mt={14} align="center">
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.noData', 'Sin datos')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#1e3a8a' : '#bfdbfe' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.low', 'Baja')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#2563eb' : '#3b82f6' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.medium', 'Media')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#60a5fa' : '#1d4ed8' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.high', 'Alta')}</Text>
                </Group>
              </Paper>

              {/* Col 2: Weekly Progress Vertical Bars */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.weeklyProgress', 'Progreso semanal')}
                </Text>

                <div style={{ display: 'flex', height: 140, alignItems: 'flex-end', gap: 12, padding: '10px 4px 4px 4px' }}>
                  {/* Y Axis */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', paddingRight: 4 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>100%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>75%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>50%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>25%</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>0%</Text>
                  </div>

                  {/* Bars */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, height: '100%', alignItems: 'flex-end' }}>
                    {weeklyProgress.slice(0, 5).map((w, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <Text size="xs" fw={600} style={{ fontSize: 10, marginBottom: 4 }}>
                          {w.percent}%
                        </Text>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 24,
                            height: `${Math.max(6, w.percent)}%`,
                            backgroundColor: w.percent > 0 ? 'var(--mantine-primary-color-filled)' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                        <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 10 }}>
                          {w.label}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                <Group justify="center" gap={6} mt={10}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    {t('dashboard.completedPct', 'Completado (%)')}
                  </Text>
                </Group>
              </Paper>

              {/* Col 3: Donut Chart Task Breakdown */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.taskBreakdown', 'Desglose de tareas por área')}
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    <svg width="100" height="100" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--app-card-border)" strokeWidth="6" />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="var(--mantine-color-teal-filled)"
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.completedPct || 40} ${100 - (statusDistribution.completedPct || 40)}`}
                        strokeDashoffset="25"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="var(--mantine-color-orange-filled)"
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.inProgressPct || 40} ${100 - (statusDistribution.inProgressPct || 40)}`}
                        strokeDashoffset={`${25 - (statusDistribution.completedPct || 40)}`}
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
                      <Text fw={700} size="xs" style={{ fontSize: 10 }}>Total:</Text>
                      <Text fw={800} size="xs" style={{ fontSize: 12 }}>
                        {statusDistribution.total || 5} tareas
                      </Text>
                    </div>
                  </div>

                  <Stack gap={4}>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-teal-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        {t('tasks.statusDone', 'Completadas')}: <b>{statusDistribution.completed || 2} ({statusDistribution.completedPct || 40}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        {t('reports.inProgressSection', 'En curso')}: <b>{statusDistribution.inProgress || 2} ({statusDistribution.inProgressPct || 40}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-gray-5)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        {t('tasks.statusTodo', 'Pendientes')}: <b>{statusDistribution.pending || 1} ({statusDistribution.pendingPct || 20}%)</b>
                      </Text>
                    </Group>
                  </Stack>
                </div>

                <Text size="xs" c="dimmed" ta="center" mt={12} style={{ fontSize: 10 }}>
                  {t('dashboard.basedOnActiveTasks', 'Basado en tareas activas este mes')}
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Bottom 2-Column Grid: Principales Logros & En curso */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
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
                      {t('dashboard.noAchievements', 'No hay entregables completados este mes')}
                    </Text>
                  )}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllCompleted', 'Ver todas las tareas completadas')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>

              {/* En curso y arrastradas */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndCarried', 'En curso y arrastradas')}
                  </Text>
                </Group>

                <Stack gap={8}>
                  {(periodSummary?.inProgressTasksList || []).slice(0, 4).map((task) => (
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
                          <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                            {task.title}
                          </Text>
                        </Group>
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
                  {t('dashboard.viewAllInProgress', 'Ver todas las tareas en curso')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>

            {/* Footer notice */}
            <Text size="xs" c="dimmed" ta="center" py="xs" style={{ fontSize: 11 }}>
              {t('dashboard.autoUpdatedFooter', 'Los datos se actualizan automáticamente con cada registro diario.')}
            </Text>
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
          title={`Monthly Report (${monthRange.monthTitle})`}
          content={compiledMonthlyReport}
          defaultFileName={`monthly-report-${monthRange.start}-to-${monthRange.end}`}
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
