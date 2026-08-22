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
  IconCalendarMonth,
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

export const MonthlyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { selectedDate, notesList, tasks, openTaskModal } = useAppStore();
  const [currentMonthDate, setCurrentMonthDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'tasks'>('document');

  const monthRange = useMemo(() => {
    const d = dayjs(currentMonthDate);
    const start = d.startOf('month');
    const end = d.endOf('month');

    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
      monthTitle: d.locale(i18n.language === 'es' ? 'es' : 'en').format('MMMM YYYY'),
      daysInMonth: d.daysInMonth(),
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
    openTaskModal(task);
  };

  // Compile monthly continuous markdown document
  const compiledMonthlyReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📅 Monthly Worklog Report - ${monthRange.monthTitle}\n\n`;
    doc += `> **Period**: \`${monthRange.start}\` to \`${monthRange.end}\`  \n`;
    doc += `> **Active Working Days**: ${periodSummary.activeDays} of ${monthRange.daysInMonth}  \n`;
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
      doc += `_${t('monthly.noNotes')}_\n`;
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
  }, [periodSummary, monthRange, i18n.language, t]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(compiledMonthlyReport);
    notifications.show({
      title: t('common.copied'),
      message: t('weekly.reportCopied'),
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
          <ActionIcon variant="default" size="lg" onClick={handlePrevMonth} radius="md">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconCalendarMonth size={16} />}
            onClick={handleThisMonth}
            radius="md"
          >
            {t('monthly.currentMonth')}
          </Button>
          <ActionIcon variant="default" size="lg" onClick={handleNextMonth} radius="md">
            <IconChevronRight size={18} />
          </ActionIcon>

          <Stack gap={0} ml="xs">
            <Title order={3} style={{ textTransform: 'capitalize' }}>
              {monthRange.monthTitle}
            </Title>
            <Text size="xs" c="dimmed">
              {t('monthly.subtitle', { month: monthRange.monthTitle })}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs">
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'document' | 'tasks')}
            data={[
              { label: t('reports.documentTab'), value: 'document' },
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
            {t('monthly.copyReport')}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFileExport size={16} />}
            onClick={() => setIsExportModalOpen(true)}
            radius="md"
          >
            {t('monthly.exportReport')}
          </Button>
        </Group>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('monthly.activeDays')}
              </Text>
              <Text fw={700} size="xl">
                {periodSummary?.activeDays ?? 0} / {monthRange.daysInMonth}
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
                {t('monthly.totalTasks')}
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

      {/* Main Content Area: Document View vs Interactive Tasks View */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'document' ? (
          <MarkdownViewer content={compiledMonthlyReport} allowToggleTasks={false} />
        ) : (
          <PeriodTasksBreakdown periodSummary={periodSummary} onOpenTask={handleOpenTask} />
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          opened={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={`Monthly Report - ${monthRange.monthTitle}`}
          content={compiledMonthlyReport}
          defaultFileName={`monthly-report-${monthRange.start}-to-${monthRange.end}`}
        />
      )}
    </div>
  );
};

