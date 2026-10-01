import dayjs from 'dayjs';
import { useComputedColorScheme } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { PeriodSummary, ReportPeriod, TaskMeta } from '../../../types';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { getReportRange } from '../../../utils/reportPeriod';
import { resolveTaskContext } from '../../../utils/areaProjectUtils';
import { WeeklyDashboard } from '../weekly/WeeklyDashboard';
import { MonthlyDashboard, type MonthlyHeatmapDay } from '../monthly/MonthlyDashboard';
import { YearlyDashboard } from '../yearly/YearlyDashboard';

interface ReportsOverviewProps {
  date: string;
  period: ReportPeriod;
  summary: PeriodSummary;
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onOpenTask: (task: TaskMeta) => void;
  onViewTasks: () => void;
  onOpenDay: (date: string) => void;
  onOpenPeriod: (period: ReportPeriod, date: string) => void;
}

export function ReportsOverview({ date, period, summary, weekStartDay, onOpenTask, onViewTasks, onOpenDay, onOpenPeriod }: ReportsOverviewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? 'es' : 'en';
  const isDark = useComputedColorScheme('light') === 'dark';
  const { areas, projects, allTags } = useAppStoreSelector((s) => ({ areas: s.areas, projects: s.projects, allTags: s.allTags }));
  const range = getReportRange(date, period, weekStartDay);
  const completedTasks = summary.completedTasksList ?? [];
  const inProgressTasks = summary.inProgressTasksList ?? [];
  const percent = summary.totalTasks ? Math.round(summary.completedTasks / summary.totalTasks * 100) : 0;
  const common = { isDark, activeDaysCount: summary.activeDays, completedTasksCount: summary.completedTasks,
    totalTasksCount: summary.totalTasks, completionPercent: percent, completedTasks, inProgressTasks, onOpenTask, onViewTasks };
  const projectMap = new Map<string, { total: number; completed: number }>();
  for (const task of [...completedTasks, ...inProgressTasks, ...(summary.waitingTasksList ?? []), ...(summary.backlogTasksList ?? [])]) {
    const context = resolveTaskContext(task, areas, projects, allTags);
    const name = context.project || task.project || t('reports.generalProject');
    const row = projectMap.get(name) ?? { total: 0, completed: 0 };
    row.total++;
    if (completedTasks.some((item) => item.id === task.id)) row.completed++;
    projectMap.set(name, row);
  }
  const projectBreakdown = Array.from(projectMap, ([name, row]) => ({ name, ...row, percent: Math.round(row.completed / row.total * 100) }));
  if (period === 'week') {
    const weekDays = Array.from({ length: 7 }, (_,i) => {
      const day = dayjs(range.start).add(i, 'day').locale(locale);
      return { date: day.format('YYYY-MM-DD'), dayName: day.format('ddd'), dayNumber: day.format('D'),
        hasNote: summary.days.some((note) => note.date === day.format('YYYY-MM-DD') && note.exists), isToday: day.isSame(dayjs(), 'day') };
    });
    return <WeeklyDashboard {...common} weekDays={weekDays} projectBreakdown={projectBreakdown} onOpenDay={onOpenDay} />;
  }
  if (period === 'month') {
    const start = dayjs(range.start);
    const heatmapDays: MonthlyHeatmapDay[] = [];
    for (let i = 0; i < (start.day() - weekStartDay + 7) % 7; i++) {
      heatmapDays.push({ dayNumber: null, date: null, level: 0, note: null, isFuture: false, isToday: false });
    }
    for (let i = 0; i < range.totalDays; i++) {
      const day = start.add(i, 'day');
      const note = summary.days.find((item) => item.date === day.format('YYYY-MM-DD'));
      heatmapDays.push({ dayNumber: day.date(), date: day.format('YYYY-MM-DD'), note,
        level: note?.exists ? Math.min(3, Math.max(1, Math.ceil(note.tasksTotal / 2))) : 0,
        isToday: day.isSame(dayjs(), 'day'), isFuture: day.isAfter(dayjs(), 'day') });
    }
    const weeklyProgress = [];
    let week = dayjs(getReportRange(range.start, 'week', weekStartDay).start);
    while (week.format('YYYY-MM-DD') <= range.end) {
      const end = week.add(6, 'day');
      const days = summary.days.filter((day) => day.date >= week.format('YYYY-MM-DD') && day.date <= end.format('YYYY-MM-DD'));
      const completed = days.reduce((n,day) => n + day.tasksCompleted, 0);
      const total = days.reduce((n,day) => n + day.tasksTotal, 0);
      weeklyProgress.push({ label: t('reports.weekNumber', { number: weeklyProgress.length + 1 }),
        rangeLabel: `${week.locale(locale).format('D MMM')} – ${end.locale(locale).format('D MMM')}`,
        date: week.isBefore(start) ? range.start : week.format('YYYY-MM-DD'), completed, total,
        percent: total ? Math.round(completed / total * 100) : 0, isFuture: week.isAfter(dayjs(), 'day') });
      week = week.add(7, 'day');
    }
    const inProgress = inProgressTasks.length;
    const pending = Math.max(0, summary.totalTasks - summary.completedTasks - inProgress);
    const total = summary.completedTasks + inProgress + pending;
    const statusDistribution = { completed: summary.completedTasks, completedPct: percent, inProgress,
      inProgressPct: total ? Math.round(inProgress / total * 100) : 0, pending, pendingPct: total ? Math.round(pending / total * 100) : 0, total };
    return <MonthlyDashboard {...common} daysInMonth={range.totalDays} heatmapDays={heatmapDays} weeklyProgress={weeklyProgress}
      statusDistribution={statusDistribution} weekStartDay={weekStartDay} onOpenWeek={(day) => onOpenPeriod('week', day)} />;
  }
  const year = dayjs(date).year();
  const monthlyActivity = Array.from({ length: 12 }, (_,m) => {
    const month = dayjs(date).month(m).startOf('month').locale(locale);
    const count = summary.days.filter((d) => d.exists && dayjs(d.date).month() === m).length;
    return { name: month.format('MMM'), monthIndex: m, count, isCurrentMonth: month.isSame(dayjs(), 'month'),
      isFutureMonth: month.isAfter(dayjs(), 'month'), heightPercent: count / month.daysInMonth() * 100 };
  });
  const projectDistribution = projectBreakdown.map((p) => ({ name: p.name, count: p.total }));
  const priorityDistribution = Object.entries(summary.priorityBreakdown ?? {}).map(([key, value]) => ({ key, count: value.total }));
  return <YearlyDashboard {...common} year={String(year)} daysInYear={range.totalDays} monthlyActivity={monthlyActivity}
    projectDistribution={projectDistribution} priorityDistribution={priorityDistribution} onViewAllAchievements={onViewTasks}
    onOpenMonth={(month) => onOpenPeriod('month', dayjs(date).month(month).startOf('month').format('YYYY-MM-DD'))} />;
}
