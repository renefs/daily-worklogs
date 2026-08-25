import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  Card,
  SimpleGrid,
  RingProgress,
  SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconCalendarStats,
  IconListCheck,
  IconFlame,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';

export const YearlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { selectedDate, notesList, tasks, openTaskEditor } = useAppStore();
  const [currentYearDate, setCurrentYearDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'days' | 'tasks'>('document');

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
      startFormatted: startObj.locale(i18n.language === 'es' ? 'es' : 'en').format('MMM D, YYYY'),
      endFormatted: endObj.locale(i18n.language === 'es' ? 'es' : 'en').format('MMM D, YYYY'),
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
    const waiting = periodSummary.waitingTasksList || [];
    const backlog = periodSummary.backlogTasksList || [];
    const hasAnyTasks = completed.length > 0 || inProgress.length > 0 || waiting.length > 0 || backlog.length > 0;

    // Structured Action Items & Deliverables Section
    if (hasAnyTasks) {
      doc += `## 📋 Action Items & Deliverables\n\n`;

      if (completed.length > 0) {
        doc += `### ✅ ${t('reports.completedSection')} (${completed.length})\n\n`;
        completed.forEach((task) => {
          const priority = task.priority ? ` \`[${task.priority.toUpperCase()}]\`` : '';
          const completedAt = task.completedDate ? ` _(Completed: ${task.completedDate})_` : '';
          const tags = task.tags && task.tags.length > 0 ? ` ${task.tags.map((tg) => `#${tg}`).join(' ')}` : '';
          doc += `- [x] **${task.title}**${priority}${completedAt}${tags}\n`;
        });
        doc += `\n`;
      }

      if (inProgress.length > 0) {
        doc += `### ⏳ ${t('reports.inProgressSection')} (${inProgress.length})\n\n`;
        inProgress.forEach((task) => {
          const priority = task.priority ? ` \`[${task.priority.toUpperCase()}]\`` : '';
          const startedAt = task.startedDate ? ` _(Started: ${task.startedDate})_` : '';
          const due = task.due ? ` _(Due: ${task.due})_` : '';
          const tags = task.tags && task.tags.length > 0 ? ` ${task.tags.map((tg) => `#${tg}`).join(' ')}` : '';
          doc += `- [ ] **${task.title}**${priority}${startedAt}${due}${tags}\n`;
        });
        doc += `\n`;
      }

      if (waiting.length > 0) {
        doc += `### 🚧 ${t('reports.waitingSection')} (${waiting.length})\n\n`;
        waiting.forEach((task) => {
          const priority = task.priority ? ` \`[${task.priority.toUpperCase()}]\`` : '';
          const tags = task.tags && task.tags.length > 0 ? ` ${task.tags.map((tg) => `#${tg}`).join(' ')}` : '';
          doc += `- [ ] **${task.title}**${priority}${tags}\n`;
        });
        doc += `\n`;
      }

      if (backlog.length > 0) {
        doc += `### 📋 ${t('reports.backlogSection')} (${backlog.length})\n\n`;
        backlog.forEach((task) => {
          const priority = task.priority ? ` \`[${task.priority.toUpperCase()}]\`` : '';
          const tags = task.tags && task.tags.length > 0 ? ` ${task.tags.map((tg) => `#${tg}`).join(' ')}` : '';
          doc += `- [ ] **${task.title}**${priority}${tags}\n`;
        });
        doc += `\n`;
      }

      doc += `---\n\n`;
    }

    // Daily checklist summary if any checklist items exist in daily notes
    const dailyItems = periodSummary.dailyChecklistItems || [];
    if (dailyItems.length > 0) {
      const completedDaily = dailyItems.filter((i) => i.completed).length;
      doc += `## 📝 ${t('reports.dailyChecklistsSection')} (${completedDaily}/${dailyItems.length} Done)\n\n`;

      // Group by day
      const dayMap = new Map<string, Array<{ text: string; completed: boolean }>>();
      periodSummary.days.forEach((day) => {
        if (day.checklistItems && day.checklistItems.length > 0) {
          dayMap.set(day.date, day.checklistItems);
        }
      });

      dayMap.forEach((items, dateStr) => {
        const dayFormatted = dayjs(dateStr).locale(i18n.language === 'es' ? 'es' : 'en').format('dddd, MMM D');
        doc += `**${dayFormatted} (\`${dateStr}\`)**:\n`;
        items.forEach((item) => {
          doc += `- [${item.completed ? 'x' : ' '}] ${item.text}\n`;
        });
        doc += `\n`;
      });

      doc += `---\n\n`;
    }

    const activeDayNotes = periodSummary.days.filter((d) => d.exists && d.content.trim().length > 0);

    if (activeDayNotes.length === 0 && !hasAnyTasks && dailyItems.length === 0) {
      doc += `_${t('yearly.noNotes')}_\n`;
      return doc;
    }

    if (activeDayNotes.length > 0) {
      doc += `## 🗓️ ${t('reports.dailyNotesSummary')}\n\n`;
      activeDayNotes.forEach((day) => {
        const dayName = dayjs(day.date)
          .locale(i18n.language === 'es' ? 'es' : 'en')
          .format('dddd, MMMM D, YYYY');

        doc += `### 🗓️ ${dayName} (\`${day.date}\`)\n\n`;
        doc += `${day.content.trim()}\n\n`;
        doc += `---\n\n`;
      });
    }

    return doc;
  }, [periodSummary, yearRange, i18n.language, t]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(compiledYearlyReport);
    notifications.show({
      title: t('common.copied'),
      message: t('yearly.reportCopied'),
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const completionPercent =
    periodSummary && periodSummary.totalTasks > 0
      ? Math.round((periodSummary.completedTasks / periodSummary.totalTasks) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Header Controls */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="xs">
          <ActionIcon variant="default" size="lg" onClick={handlePrevYear} radius="md">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconCalendarStats size={16} />}
            onClick={handleThisYear}
            radius="md"
          >
            {t('yearly.currentYear')}
          </Button>
          <ActionIcon variant="default" size="lg" onClick={handleNextYear} radius="md">
            <IconChevronRight size={18} />
          </ActionIcon>

          <Stack gap={0} ml="xs">
            <Title order={3}>
              {yearRange.year}
            </Title>
            <Text size="xs" c="dimmed">
              {t('yearly.subtitle', { year: yearRange.year, start: yearRange.startFormatted, end: yearRange.endFormatted })}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs">
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'document' | 'days' | 'tasks')}
            data={[
              { label: t('reports.documentTab'), value: 'document' },
              { label: t('reports.daysTab'), value: 'days' },
              { label: t('reports.tasksTab'), value: 'tasks' },
            ]}
            radius="md"
            size="sm"
          />

          <Button
            variant="light"
            color="primary"
            leftSection={<IconCopy size={16} />}
            onClick={handleCopyReport}
            radius="md"
          >
            {t('yearly.copyReport')}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFileExport size={16} />}
            onClick={() => setIsExportModalOpen(true)}
            radius="md"
          >
            {t('yearly.exportReport')}
          </Button>
        </Group>
      </Group>

      {/* Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('yearly.activeDays')}
              </Text>
              <Text fw={700} size="xl">
                {periodSummary?.activeDays ?? 0} / {yearRange.daysInYear}
              </Text>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: 'var(--mantine-color-orange-light)',
                color: 'var(--mantine-color-orange-filled)',
              }}
            >
              <IconFlame size={22} />
            </div>
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('yearly.totalTasks')}
              </Text>
              <Text fw={700} size="xl">
                {periodSummary?.completedTasks ?? 0} / {periodSummary?.totalTasks ?? 0}
              </Text>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: 'var(--mantine-color-teal-light)',
                color: 'var(--mantine-color-teal-filled)',
              }}
            >
              <IconListCheck size={22} />
            </div>
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('weekly.completionRate')}
              </Text>
              <Text fw={700} size="xl">
                {completionPercent}%
              </Text>
            </div>
            <RingProgress
              size={54}
              roundCaps
              thickness={5}
              sections={[{ value: completionPercent, color: 'teal' }]}
            />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main Content Area: Document View vs Day-by-Day List vs Interactive Tasks View */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'document' ? (
          <MarkdownViewer content={compiledYearlyReport} allowToggleTasks={false} />
        ) : activeTab === 'days' ? (
          <PeriodDaysList periodSummary={periodSummary} />
        ) : (
          <PeriodTasksBreakdown periodSummary={periodSummary} onOpenTask={handleOpenTask} />
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Annual Report - ${yearRange.year}`}
          content={compiledYearlyReport}
          defaultFileName={`annual-report-${yearRange.year}`}
        />
      )}
    </div>
  );
};
