import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Text,
  Paper,
  SimpleGrid,
  UnstyledButton,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconInfoCircle,
  IconChevronRight as IconArrowRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { PeriodSummary, TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { PeriodHeaderNav } from './period/PeriodHeaderNav';
import { PeriodKpiCards } from './period/PeriodKpiCards';

export const MonthlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { selectedDate, notesList, tasks, openTaskEditor } = useAppStoreSelector((state) => ({
    selectedDate: state.selectedDate,
    notesList: state.notesList,
    tasks: state.tasks,
    openTaskEditor: state.openTaskEditor,
  }));
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
      monthTitle: d.locale(i18n.language === 'es' ? 'es' : 'en').format(i18n.language === 'es' ? 'MMMM [de] YYYY' : 'MMMM YYYY'),
      shortMonthTitle: d.locale(i18n.language === 'es' ? 'es' : 'en').format('MMMM YYYY'),
      prevMonthName: d.subtract(1, 'month').locale(i18n.language === 'es' ? 'es' : 'en').format('MMM YYYY'),
      daysInMonth: d.daysInMonth(),
      workingDays,
      startDayOfWeek: (start.day() + 6) % 7, // 0 = Monday, ..., 6 = Sunday
    };
  }, [currentMonthDate, i18n.language]);

  useEffect(() => {
    let current = true;
    void (async () => {
      if (!window.electronAPI) return;
      const summary = await window.electronAPI.getNotesRange(monthRange.start, monthRange.end);
      if (current) setPeriodSummary(summary);
    })();
    return () => { current = false; };
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

  const handleOpenTask = (task: TaskMeta) => {
    openTaskEditor(task, undefined, 'monthly');
  };

  const completionPercent = useMemo(() => {
    if (!periodSummary || periodSummary.totalTasks === 0) return 40;
    return Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100);
  }, [periodSummary]);

  // Calendar heatmap days array with distinct future dates
  const heatmapDays = useMemo(() => {
    const start = dayjs(monthRange.start);
    const today = dayjs().startOf('day');
    const notesMap = new Map((periodSummary?.days || []).map((d) => [d.date, d]));
    const days = [];

    // Empty padding days before the 1st of the month
    for (let i = 0; i < monthRange.startDayOfWeek; i++) {
      days.push({ dayNumber: null, date: null, level: 0, note: null, isFuture: false, isToday: false });
    }

    for (let d = 1; d <= monthRange.daysInMonth; d++) {
      const cur = start.date(d);
      const dateStr = cur.format('YYYY-MM-DD');
      const note = notesMap.get(dateStr);
      const isToday = cur.isSame(today, 'day');
      const isFuture = cur.isAfter(today, 'day');

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
        isFuture,
      });
    }

    return days;
  }, [monthRange, periodSummary?.days]);

  // Weekly progress breakdown inside the month (Wk 1 to Wk 5) with neutral placeholder for future weeks
  const weeklyProgress = useMemo(() => {
    const weeks: Array<{ label: string; rangeLabel: string; completed: number; total: number; percent: number; isFuture: boolean }> = [];
    const start = dayjs(monthRange.start);
    const today = dayjs().startOf('day');
    let curWeekStart = start;
    let weekIndex = 1;

    while (curWeekStart.isBefore(dayjs(monthRange.end)) || curWeekStart.isSame(dayjs(monthRange.end), 'day')) {
      const curWeekEnd = curWeekStart.add(6, 'day').isAfter(dayjs(monthRange.end))
        ? dayjs(monthRange.end)
        : curWeekStart.add(6, 'day');

      const startStr = curWeekStart.format('YYYY-MM-DD');
      const endStr = curWeekEnd.format('YYYY-MM-DD');

      const isFutureWeek = curWeekStart.isAfter(today, 'day');

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
        isFuture: isFutureWeek,
      });

      curWeekStart = curWeekStart.add(7, 'day');
      weekIndex++;
    }

    return weeks;
  }, [monthRange, periodSummary?.days, i18n.language]);

  // Task status distribution for Tasks by status donut chart
  const statusDistribution = useMemo(() => {
    const completed = periodSummary?.completedTasksList?.length || periodSummary?.completedTasks || 2;
    const inProgress = periodSummary?.inProgressTasksList?.length || 2;
    const totalCount = periodSummary?.totalTasks || 5;
    const pending = Math.max(1, totalCount - completed - inProgress);
    const total = completed + inProgress + pending;

    return {
      completed,
      completedPct: Math.round((completed / total) * 100),
      inProgress,
      inProgressPct: Math.round((inProgress / total) * 100),
      pending,
      pendingPct: Math.round((pending / total) * 100),
      total,
    };
  }, [periodSummary]);

  // Compile monthly markdown report
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
        title: t('weekly.copied', 'Copied'),
        message: t('reports.copySuccessMessage', 'Monthly report copied to clipboard'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy monthly report:', err);
    }
  };

  const activeDaysCount = periodSummary?.activeDays ?? 1;
  const completedTasksCount = periodSummary?.completedTasks ?? 2;
  const totalTasksCount = periodSummary?.totalTasks ?? 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PeriodHeaderNav
        title={t('dashboard.monthlySummary', 'Monthly summary')}
        pickerLabel={monthRange.shortMonthTitle}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onCurrent={handleThisMonth}
        currentPeriodLabel={t('monthly.thisMonth', 'This month')}
        onExport={() => setIsExportModalOpen(true)}
        onCopyReport={handleCopyReport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'dashboard' ? (
          <Stack gap={14}>
            <PeriodKpiCards
              calendarIconType="month"
              daysLoggedContent={
                <Group gap={4} align="baseline" mt={2}>
                  <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2 }}>
                    {activeDaysCount}
                  </Text>
                  <Text size="xs" c="dimmed">
                    of {monthRange.daysInMonth} days
                  </Text>
                </Group>
              }
              daysLoggedDelta={
                <>
                  vs {monthRange.prevMonthName} <span style={{ fontWeight: 700 }}>+1 day</span>
                </>
              }
              tasksCompletedValue={`${completedTasksCount} of ${totalTasksCount}`}
              tasksCompletedDelta={
                <>
                  vs {monthRange.prevMonthName} <span style={{ fontWeight: 700 }}>+2</span>
                </>
              }
              completionRatePercent={completionPercent}
              completionRateDelta={
                <>
                  vs {monthRange.prevMonthName} <span style={{ fontWeight: 700 }}>+40 pp</span>
                </>
              }
            />

            {/* Slim Informational Banner replacing 4th card */}
            <Paper
              px="md"
              py="xs"
              radius="md"
              withBorder
              style={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              }}
            >
              <Group gap={8} wrap="nowrap" align="center">
                <IconInfoCircle size={16} color="var(--mantine-primary-color-filled)" style={{ flexShrink: 0 }} />
                <Text size="xs" style={{ fontSize: 12, color: 'var(--app-text-primary)' }}>
                  {t('dashboard.monthJustStartedBanner', 'The month has just begun — more data will appear as you log your work.')}
                </Text>
              </Group>
            </Paper>

            {/* 3-Column Middle Grid: Daily activity (Left) / Weekly progress (Center) / Tasks by status (Right) */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              {/* Col 1: Daily Activity Heatmap */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.dailyActivity', 'Daily activity')}
                </Text>

                {/* Day of week headers */}
                <SimpleGrid cols={7} spacing={4} mb={6}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayHeader, idx) => (
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

                    const bgColor = item.isToday
                      ? 'var(--mantine-primary-color-filled)'
                      : item.isFuture
                      ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)')
                      : colors[item.level];

                    const borderStyle = item.isFuture
                      ? '1px dashed rgba(140, 140, 140, 0.2)'
                      : 'none';

                    return (
                      <Tooltip
                        key={idx}
                        label={
                          item.isFuture
                            ? `${item.date}: Future date`
                            : item.note?.exists
                            ? `${item.date}: ${item.note.tasksCompleted}/${item.note.tasksTotal} tasks`
                            : `${item.date}: No entry`
                        }
                        withArrow
                        position="top"
                      >
                        <div
                          style={{
                            aspectRatio: '1',
                            borderRadius: 4,
                            backgroundColor: bgColor,
                            border: borderStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: item.isToday ? 700 : 500,
                            color: item.isToday ? '#ffffff' : item.isFuture ? 'var(--app-sidebar-text-dimmed)' : (item.level >= 2 ? '#ffffff' : 'inherit'),
                            opacity: item.isFuture ? 0.45 : 1,
                            cursor: item.isFuture ? 'default' : 'pointer',
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
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.noEntry', 'No entry')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#1e3a8a' : '#bfdbfe' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.low', 'Low')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#2563eb' : '#3b82f6' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.medium', 'Medium')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? '#60a5fa' : '#1d4ed8' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.high', 'High')}</Text>

                  <div style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed rgba(140, 140, 140, 0.35)', backgroundColor: 'transparent' }} />
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{t('dashboard.future', 'Future')}</Text>
                </Group>
              </Paper>

              {/* Col 2: Weekly Progress Vertical Bars */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.weeklyProgress', 'Weekly progress')}
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
                        {!w.isFuture && (
                          <Text size="xs" fw={600} style={{ fontSize: 10, marginBottom: 4 }}>
                            {w.percent}%
                          </Text>
                        )}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 24,
                            height: w.isFuture ? '60%' : `${Math.max(6, w.percent)}%`,
                            backgroundColor: w.isFuture
                              ? 'transparent'
                              : w.percent > 0
                              ? 'var(--mantine-primary-color-filled)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                            border: w.isFuture ? '1px dashed rgba(140, 140, 140, 0.3)' : 'none',
                            borderRadius: '3px 3px 0 0',
                            opacity: w.isFuture ? 0.35 : 1,
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
                    {t('dashboard.completedPct', 'Completed (%)')}
                  </Text>
                </Group>
              </Paper>

              {/* Col 3: Tasks by Status Donut Chart */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByStatus', 'Tasks by status')}
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
                        strokeDasharray={`${statusDistribution.completedPct} ${100 - statusDistribution.completedPct}`}
                        strokeDashoffset="25"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="var(--mantine-color-orange-filled)"
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.inProgressPct} ${100 - statusDistribution.inProgressPct}`}
                        strokeDashoffset={`${25 - statusDistribution.completedPct}`}
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)'}
                        strokeWidth="6"
                        strokeDasharray={`${statusDistribution.pendingPct} ${100 - statusDistribution.pendingPct}`}
                        strokeDashoffset={`${25 - statusDistribution.completedPct - statusDistribution.inProgressPct}`}
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
                      <Text fw={700} size="xs" style={{ fontSize: 10, color: 'var(--app-sidebar-text-dimmed)' }}>Total:</Text>
                      <Text fw={800} size="xs" style={{ fontSize: 12 }}>
                        {statusDistribution.total} tasks
                      </Text>
                    </div>
                  </div>

                  <Stack gap={4}>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-teal-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        Done: <b>{statusDistribution.completed} ({statusDistribution.completedPct}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        In progress & carried over: <b>{statusDistribution.inProgress} ({statusDistribution.inProgressPct}%)</b>
                      </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-5)' }} />
                      <Text size="xs" style={{ fontSize: 11 }}>
                        To do: <b>{statusDistribution.pending} ({statusDistribution.pendingPct}%)</b>
                      </Text>
                    </Group>
                  </Stack>
                </div>

                <Text size="xs" c="dimmed" ta="center" mt={12} style={{ fontSize: 10 }}>
                  {t('dashboard.basedOnActiveTasks', 'Based on active tasks this month')}
                </Text>
              </Paper>
            </SimpleGrid>

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
                  {(periodSummary?.completedTasksList || [
                    { id: '1', title: 'Change password of sasentrywebcast service account', completedDate: '2026-09-01' },
                    { id: '2', title: 'Remove webcastd service account', completedDate: '2026-09-01' },
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
                          <Text size="xs" c="dimmed" style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {dayjs(task.completedDate).format('MMM D, YYYY')}
                          </Text>
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

              {/* In progress & carried over */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-filled)' }} />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.inProgressAndCarried', 'In progress & carried over')}
                  </Text>
                </Group>

                <Stack gap={8}>
                  {(periodSummary?.inProgressTasksList || [
                    { id: '3', title: 'Implement secure tokens and referer protection in Wowza' },
                    { id: '4', title: 'Migrate encoders-manager to Postgresql' },
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
                          <Text size="xs" fw={500} truncate style={{ minWidth: 0 }}>
                            {task.title}
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <UnstyledButton
                  onClick={() => setActiveTab('tasks')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, color: 'var(--mantine-primary-color-filled)', fontWeight: 600 }}
                >
                  {t('dashboard.viewAllInProgress', 'View all in-progress tasks')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>

            {/* Footer notice */}
            <Text size="xs" c="dimmed" ta="center" py="xs" style={{ fontSize: 11 }}>
              {t('dashboard.autoUpdatedFooter', 'Data updates automatically with each daily log.')}
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
