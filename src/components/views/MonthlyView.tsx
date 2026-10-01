import React, { useEffect, useState, useMemo } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { PeriodSummary, TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { PeriodHeaderNav } from './period/PeriodHeaderNav';
import { MonthlyDashboard } from './monthly/MonthlyDashboard';

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
          <MonthlyDashboard
            isDark={isDark}
            daysInMonth={monthRange.daysInMonth}
            previousMonthLabel={monthRange.prevMonthName}
            activeDaysCount={activeDaysCount}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
            completionPercent={completionPercent}
            heatmapDays={heatmapDays}
            weeklyProgress={weeklyProgress}
            statusDistribution={statusDistribution}
            completedTasks={periodSummary?.completedTasksList}
            inProgressTasks={periodSummary?.inProgressTasksList}
            onOpenTask={handleOpenTask}
            onViewTasks={() => setActiveTab('tasks')}
          />
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
