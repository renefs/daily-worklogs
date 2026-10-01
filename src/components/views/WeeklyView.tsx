import React, { useEffect, useState, useMemo } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import type { PeriodSummary, TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { PeriodHeaderNav } from './period/PeriodHeaderNav';
import { resolveTaskContext } from '../../utils/areaProjectUtils';
import { WeeklyDashboard, type WeeklyDayActivity, type WeeklyProjectProgress } from './weekly/WeeklyDashboard';

dayjs.extend(isoWeek);

export const WeeklyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { settings, selectedDate, notesList, tasks, openTaskEditor, areas = [], projects = [], allTags = [] } = useAppStoreSelector((state) => ({
    settings: state.settings,
    selectedDate: state.selectedDate,
    notesList: state.notesList,
    tasks: state.tasks,
    openTaskEditor: state.openTaskEditor,
    areas: state.areas,
    projects: state.projects,
    allTags: state.allTags,
  }));
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

  useEffect(() => {
    let current = true;
    void (async () => {
      if (!window.electronAPI) return;
      const summary = await window.electronAPI.getNotesRange(weekRange.start, weekRange.end);
      if (current) setPeriodSummary(summary);
    })();
    return () => { current = false; };
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

  const handleOpenTask = (task: TaskMeta) => {
    openTaskEditor(task, undefined, 'weekly');
  };

  const weekDays = useMemo<WeeklyDayActivity[]>(() => {
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

  const projectBreakdown = useMemo<WeeklyProjectProgress[]>(() => {
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
        title: t('weekly.copied', 'Copied'),
        message: t('reports.copySuccessMessage', 'Weekly report copied to clipboard'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy weekly report:', err);
    }
  };

  const activeDaysCount = periodSummary?.activeDays ?? 0;
  const completedTasksCount = periodSummary?.completedTasks ?? 0;
  const totalTasksCount = periodSummary?.totalTasks ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <PeriodHeaderNav
        title={t('dashboard.weeklySummary', 'Weekly summary')}
        subtitle={`${weekRange.startFormatted} – ${weekRange.endFormatted}`}
        pickerLabel={`${weekRange.startFormatted} – ${weekRange.endFormatted}`}
        onPrev={handlePrevWeek}
        onNext={handleNextWeek}
        onCurrent={handleThisWeek}
        currentPeriodLabel={t('weekly.thisWeek', 'This week')}
        onExport={() => setIsExportModalOpen(true)}
        onCopyReport={handleCopyReport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'dashboard' ? (
          <WeeklyDashboard
            isDark={isDark}
            weekDays={weekDays}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
            activeDaysCount={activeDaysCount}
            completionPercent={completionPercent}
            completedTasks={periodSummary?.completedTasksList}
            inProgressTasks={periodSummary?.inProgressTasksList}
            projectBreakdown={projectBreakdown}
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
          title={`Weekly Report (${weekRange.start} to ${weekRange.end})`}
          content={compiledMarkdownReport}
          defaultFileName={`weekly-report-${weekRange.start}-to-${weekRange.end}`}
        />
      )}
    </div>
  );
};
