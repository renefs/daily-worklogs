import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  RingProgress,
  Card,
  SimpleGrid,
  SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconCalendarWeek,
  IconListCheck,
  IconFlame,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PeriodSummary, TaskItem } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';

dayjs.extend(isoWeek);

export const WeeklyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, selectedDate, notesList, tasks, openTaskEditor } = useAppStore();
  const [currentWeekDate, setCurrentWeekDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'days' | 'tasks'>('document');

  // Calculate week start and end based on user's weekStartDay setting (0=Sunday ... 6=Saturday)
  const weekRange = useMemo(() => {
    const d = dayjs(currentWeekDate);
    const weekStartSetting = (settings?.weekStartDay ?? 1) as number;

    const currentDay = d.day(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const diff = (currentDay - weekStartSetting + 7) % 7;
    const start = d.subtract(diff, 'day');
    const end = start.add(6, 'day');
    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
      startFormatted: start.locale(i18n.language === 'es' ? 'es' : 'en').format('MMM D, YYYY'),
      endFormatted: end.locale(i18n.language === 'es' ? 'es' : 'en').format('MMM D, YYYY'),
    };
  }, [currentWeekDate, settings?.weekStartDay, i18n.language]);

  // Fetch week notes
  const fetchWeekData = async () => {
    if (!window.electronAPI) return;
    try {
      const summary = await window.electronAPI.getNotesRange(weekRange.start, weekRange.end);
      setPeriodSummary(summary);
    } catch (err) {
      console.error('Failed to get week notes range:', err);
    }
  };

  useEffect(() => {
    fetchWeekData();
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

  const handleOpenTask = (task: TaskItem) => {
    openTaskEditor(task, undefined, 'weekly');
  };

  // Compile continuous executive report markdown text
  const compiledMarkdownReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📊 Executive Worklog Report (${weekRange.startFormatted} - ${weekRange.endFormatted})\n\n`;
    doc += `> **Period**: \`${weekRange.start}\` to \`${weekRange.end}\`  \n`;
    doc += `> **Active Days Logged**: ${periodSummary.activeDays} of 7  \n`;
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
      doc += `_${t('weekly.noNotes')}_\n`;
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
  }, [periodSummary, weekRange, i18n.language, t]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(compiledMarkdownReport);
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
          <ActionIcon variant="default" size="lg" onClick={handlePrevWeek} radius="md">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconCalendarWeek size={16} />}
            onClick={handleThisWeek}
            radius="md"
          >
            {t('weekly.currentWeek')}
          </Button>
          <ActionIcon variant="default" size="lg" onClick={handleNextWeek} radius="md">
            <IconChevronRight size={18} />
          </ActionIcon>

          <Stack gap={0} ml="xs">
            <Title order={3}>
              {weekRange.startFormatted} – {weekRange.endFormatted}
            </Title>
            <Text size="xs" c="dimmed">
              {t('weekly.subtitle', { start: weekRange.start, end: weekRange.end })}
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
            {t('weekly.copyReport')}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFileExport size={16} />}
            onClick={() => setIsExportModalOpen(true)}
            radius="md"
          >
            {t('weekly.exportReport')}
          </Button>
        </Group>
      </Group>

      {/* Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('weekly.activeDays')}
              </Text>
              <Text fw={700} size="xl">
                {periodSummary?.activeDays ?? 0} / 7
              </Text>
            </div>
            <ThemeIconWrapper color="orange">
              <IconFlame size={22} />
            </ThemeIconWrapper>
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {t('weekly.totalTasks')}
              </Text>
              <Text fw={700} size="xl">
                {periodSummary?.completedTasks ?? 0} / {periodSummary?.totalTasks ?? 0}
              </Text>
            </div>
            <ThemeIconWrapper color="teal">
              <IconListCheck size={22} />
            </ThemeIconWrapper>
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
          <MarkdownViewer content={compiledMarkdownReport} allowToggleTasks={false} />
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
          title={`Weekly Report (${weekRange.start} to ${weekRange.end})`}
          content={compiledMarkdownReport}
          defaultFileName={`weekly-report-${weekRange.start}-to-${weekRange.end}`}
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
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-filled)`,
      }}
    >
      {children}
    </div>
  );
};

