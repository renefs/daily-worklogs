import { useState } from 'react';
import { Alert, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCalendarSearch, IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { formatReportPeriod, REPORT_VIEWS } from '../../utils/reportPeriod';
import type { TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodDaysList } from './PeriodDaysList';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodHeaderNav } from './period/PeriodHeaderNav';
import { ReportsOverview } from './period/ReportsOverview';
import classes from './ReportsView.module.css';

export function ReportsView() {
  const { t, i18n } = useTranslation();
  const state = useAppStoreSelector((s) => ({
    date: s.reportDate, period: s.reportPeriod, tab: s.reportTab, summary: s.reportSummary,
    loading: s.isReportLoading, error: s.reportError, weekStartDay: s.settings?.weekStartDay ?? 1,
    setDate: s.setReportDate, setTab: s.setReportTab, openReports: s.openReports,
    openDay: s.openReportDay, refresh: s.refreshReport, openTask: s.openTaskEditor,
  }));
  const [exportOpened, setExportOpened] = useState(false);
  const label = formatReportPeriod(state.date, state.period, state.weekStartDay, i18n.language === 'es' ? 'es' : 'en');
  const summary = state.summary;
  const title = t('reports.exportTitle', { period: label });
  const report = summary ? [
    `# ${title}`, '',
    `> ${t('reports.reportPeriod')}: ${summary.startDate} – ${summary.endDate}`,
    `> ${t('dashboard.daysLogged')}: ${summary.activeDays} / ${summary.totalDays}`,
    `> ${t('dashboard.tasksCompleted')}: ${summary.completedTasks} / ${summary.totalTasks}`, '',
    `## ${t('reports.completedSection')}`, '',
    ...(summary.completedTasksList ?? []).map((task) => `- [x] ${task.title}`), '',
    `## ${t('reports.inProgressSection')}`, '',
    ...(summary.inProgressTasksList ?? []).map((task) => `- [ ] ${task.title}`), '',
  ].join('\n') : '';
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      notifications.show({ title: t('common.copied'), message: t('reports.copySuccessMessage'), color: 'primary', icon: <IconCheck size={16} /> });
    } catch {
      notifications.show({ title: t('reports.copyFailed'), message: t('reports.copyFailedDescription'), color: 'red' });
    }
  };
  const openTask = (task: TaskMeta) => { void state.openTask(task, undefined, REPORT_VIEWS[state.period]); };
  const empty = !!summary && summary.activeDays === 0 && summary.totalTasks === 0 &&
    !(summary.periodTaskCount ?? 0) &&
    ![summary.completedTasksList, summary.inProgressTasksList, summary.waitingTasksList, summary.backlogTasksList].some((tasks) => tasks?.length);
  return (
    <Stack gap="xl" className={classes.view}>
      <PeriodHeaderNav date={state.date} period={state.period} weekStartDay={state.weekStartDay}
        onDateChange={state.setDate} onPeriodChange={(period) => { void state.openReports(period); }}
        activeTab={state.tab} onTabChange={state.setTab}
        onCopyReport={() => { void copyReport(); }} onExport={() => setExportOpened(true)}
        exportDisabled={!summary || state.loading || !!state.error} />
      <div id={`report-panel-${state.tab}`} data-testid="report-content" role="tabpanel" aria-labelledby={`report-tab-${state.tab}`} className={classes.content} aria-busy={state.loading}>
        {state.loading ? <Center py="xl"><Loader aria-label={t('common.loading')} /></Center>
          : state.error ? <Alert color="red" title={t('reports.loadFailed')} role="alert">
            <Text size="sm" mb="sm">{t('reports.loadFailedDescription')}</Text>
            <Button variant="light" color="red" onClick={() => { void state.refresh(); }}>{t('reports.retry')}</Button>
          </Alert>
          : empty ? <Stack align="center" gap="sm" py="xl">
            <IconCalendarSearch size={32} color="var(--app-text-secondary)" />
            <Title order={3}>{t('reports.emptyPeriod')}</Title>
            <Text c="dimmed" ta="center">{t('reports.emptyPeriodDescription')}</Text>
            <Button variant="light" onClick={() => state.setDate(dayjs().format('YYYY-MM-DD'))}>{t(`reports.current.${state.period}`)}</Button>
          </Stack>
          : state.tab === 'dashboard' && summary ? <ReportsOverview date={state.date} period={state.period}
            summary={summary} weekStartDay={state.weekStartDay} onOpenTask={openTask}
            onViewTasks={() => state.setTab('tasks')} onOpenDay={(date) => { void state.openDay(date); }}
            onOpenPeriod={(period, date) => { void state.openReports(period, date); }} />
          : state.tab === 'tasks' ? <PeriodTasksBreakdown periodSummary={summary} onOpenTask={openTask} />
          : <PeriodDaysList key={`${state.period}-${state.date}`} periodSummary={summary} />}
      </div>
      <Text size="xs" c="dimmed" className={classes.footer} aria-live="polite">{label}</Text>
      {exportOpened && summary && <ExportModal key={label} opened={exportOpened} onClose={() => setExportOpened(false)}
        title={title} content={report} defaultFileName={`${state.period}-report-${summary.startDate}-to-${summary.endDate}`} />}
    </Stack>
  );
}
