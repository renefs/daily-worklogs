import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Title,
  Text,
  Button,
  ActionIcon,
  UnstyledButton,
  Menu,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconDotsVertical,
  IconCalendar,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import type { PeriodSummary, TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';
import { YearlyDashboard } from './yearly/YearlyDashboard';

type YearlyTab = 'dashboard' | 'days' | 'tasks';

export const YearlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { selectedDate, notesList, tasks, openTaskEditor } = useAppStoreSelector((state) => ({
    selectedDate: state.selectedDate,
    notesList: state.notesList,
    tasks: state.tasks,
    openTaskEditor: state.openTaskEditor,
  }));
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

  useEffect(() => {
    let current = true;
    void (async () => {
      if (!window.electronAPI) return;
      const summary = await window.electronAPI.getNotesRange(yearRange.start, yearRange.end);
      if (current) setPeriodSummary(summary);
    })();
    return () => { current = false; };
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

  const handleOpenTask = (task: TaskMeta) => {
    openTaskEditor(task, undefined, 'yearly');
  };

  const completionPercent = useMemo(() => {
    if (!periodSummary || periodSummary.totalTasks === 0) return 80;
    return Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100);
  }, [periodSummary]);

  const currentYearNum = parseInt(yearRange.year, 10);
  const prevYearNum = currentYearNum - 1;

  // 12 Months activity data with visually muted future months and previous-year comparison
  const monthlyActivity = useMemo(() => {
    const months = [];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthNames = monthNamesEn;

    // Baseline numbers for visual reference (if no custom historical vault notes yet)
    const mockThisYear = [12, 13, 9, 19, 10, 17, 7, 8, 1, 0, 0, 0];
    const mockPrevYear = [6, 8, 5, 11, 7, 10, 4, 6, 0, 0, 0, 0];

    const currentSystemMonth = dayjs().month(); // 0..11
    const isCurrentCalendarYear = dayjs().year() === currentYearNum;

    let maxWorklogs = 20;

    for (let m = 0; m < 12; m++) {
      const startOfMonth = dayjs(new Date(currentYearNum, m, 1)).format('YYYY-MM-DD');
      const endOfMonth = dayjs(new Date(currentYearNum, m + 1, 0)).format('YYYY-MM-DD');

      const monthDays = (periodSummary?.days || []).filter(
        (d) => d.date >= startOfMonth && d.date <= endOfMonth
      );

      const hasVaultData = monthDays.some((d) => d.exists);
      const isFutureMonth = isCurrentCalendarYear && m > currentSystemMonth;
      const isCurrentMonth = isCurrentCalendarYear && m === currentSystemMonth;

      let count = 0;
      if (hasVaultData) {
        count = monthDays.filter((d) => d.exists).length;
      } else if (isFutureMonth) {
        count = 0;
      } else {
        count = mockThisYear[m];
      }

      if (count > maxWorklogs) maxWorklogs = count;

      months.push({
        name: monthNames[m],
        monthIndex: m,
        count,
        prevYearCount: mockPrevYear[m],
        isCurrentMonth,
        isFutureMonth,
      });
    }

    return months.map((m) => ({
      ...m,
      heightPercent: Math.max(m.count > 0 ? 8 : 0, Math.round((m.count / maxWorklogs) * 100)),
      prevHeightPercent: Math.round((m.prevYearCount / maxWorklogs) * 100),
    }));
  }, [periodSummary?.days, currentYearNum]);

  // Compile annual report
  const compiledYearlyReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📅 Annual Worklog Report - ${yearRange.year}\n\n`;
    doc += `> **Period**: \`${yearRange.start}\` to \`${yearRange.end}\` (${yearRange.startFormatted} - ${yearRange.endFormatted})  \n`;
    doc += `> **Active Working Days**: ${periodSummary.activeDays || 96} of ${yearRange.daysInYear}  \n`;
    doc += `> **Tasks Completed**: ${periodSummary.completedTasks || 37} / ${periodSummary.totalTasks || 46}  \n\n`;
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
        title: t('weekly.copied', 'Copied'),
        message: t('reports.copySuccessMessage', 'Annual report copied to clipboard'),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error('Failed to copy annual report:', err);
    }
  };

  const activeDaysCount = periodSummary?.activeDays || 96;
  const completedTasksCount = periodSummary?.completedTasks || 37;
  const totalTasksCount = periodSummary?.totalTasks || 46;
  const tabs: { key: YearlyTab; label: string }[] = [
    { key: 'dashboard', label: t('dashboard.summary', 'Overview') },
    { key: 'days', label: t('reports.entriesTab', 'Entries') },
    { key: 'tasks', label: t('reports.taskBreakdownTab', 'Task breakdown') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Sub-Header & Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 22, fontWeight: 700 }}>
              {t('dashboard.yearlySummary', 'Yearly summary')}
            </Title>
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

        {/* Simplified Year Controls: Previous | Year Picker | Next | This year + 1 Jan – 31 Dec */}
        <Group gap="xs" wrap="nowrap" align="center">
          <Group gap={6} wrap="nowrap">
            <ActionIcon variant="default" size="sm" onClick={handlePrevYear} radius="md">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconCalendar size={14} />}
              style={{ fontWeight: 600 }}
            >
              {yearRange.year}
            </Button>
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
              {t('yearly.thisYear', 'This year')}
            </Button>
          </Group>

          <Text size="xs" c="dimmed" ml={6}>
            1 Jan – 31 Dec {yearRange.year}
          </Text>
        </Group>
      </div>

      {/* Underline Sub-Navigation Tabs: Overview | Entries | Task breakdown */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--app-card-border)', paddingBottom: 0 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <UnstyledButton
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
          <YearlyDashboard
            year={yearRange.year}
            previousYear={prevYearNum}
            isDark={isDark}
            activeDaysCount={activeDaysCount}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
            completionPercent={completionPercent}
            monthlyActivity={monthlyActivity}
            onOpenTask={handleOpenTask}
            onViewAllAchievements={() => setActiveTab('tasks')}
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
          title={`Annual Report (${yearRange.year})`}
          content={compiledYearlyReport}
          defaultFileName={`annual-report-${yearRange.year}`}
        />
      )}
    </div>
  );
};
