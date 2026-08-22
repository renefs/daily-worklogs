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
import { PeriodSummary } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { ExportModal } from '../modals/ExportModal';

dayjs.extend(isoWeek);

export const WeeklyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, selectedDate, notesList } = useAppStore();
  const [currentWeekDate, setCurrentWeekDate] = useState<string>(selectedDate);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Calculate week start and end based on user's weekStartDay setting (1=Monday, 0=Sunday, 6=Saturday)
  const weekRange = useMemo(() => {
    const d = dayjs(currentWeekDate);
    const weekStartSetting = settings?.weekStartDay ?? 1;

    let start = d;
    if (weekStartSetting === 1) {
      // Monday start
      start = d.startOf('isoWeek');
    } else if (weekStartSetting === 0) {
      // Sunday start
      start = d.day(0);
    } else if (weekStartSetting === 6) {
      // Saturday start
      const currentDay = d.day(); // 0 is Sunday, 6 is Saturday
      start = currentDay === 6 ? d : d.subtract(currentDay + 1, 'day');
    }

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
  }, [weekRange.start, weekRange.end, notesList]);

  const handlePrevWeek = () => {
    setCurrentWeekDate(dayjs(currentWeekDate).subtract(7, 'day').format('YYYY-MM-DD'));
  };

  const handleNextWeek = () => {
    setCurrentWeekDate(dayjs(currentWeekDate).add(7, 'day').format('YYYY-MM-DD'));
  };

  const handleThisWeek = () => {
    setCurrentWeekDate(dayjs().format('YYYY-MM-DD'));
  };

  // Compile continuous executive report markdown text
  const compiledMarkdownReport = useMemo(() => {
    if (!periodSummary) return '';

    let doc = `# 📊 Executive Worklog Report (${weekRange.startFormatted} - ${weekRange.endFormatted})\n\n`;
    doc += `> **Period**: \`${weekRange.start}\` to \`${weekRange.end}\`  \n`;
    doc += `> **Active Days Logged**: ${periodSummary.activeDays} of 7  \n`;
    doc += `> **Tasks Completed**: ${periodSummary.completedTasks} / ${periodSummary.totalTasks}  \n\n`;
    doc += `---\n\n`;

    const activeDayNotes = periodSummary.days.filter((d) => d.exists && d.content.trim().length > 0);

    if (activeDayNotes.length === 0) {
      doc += `_${t('weekly.noNotes')}_\n`;
      return doc;
    }

    activeDayNotes.forEach((day) => {
      const dayName = dayjs(day.date)
        .locale(i18n.language === 'es' ? 'es' : 'en')
        .format('dddd, MMMM D, YYYY');

      doc += `## 🗓️ ${dayName} (\`${day.date}\`)\n\n`;
      doc += `${day.content.trim()}\n\n`;
      doc += `---\n\n`;
    });

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

      {/* Continuous Document Report Viewer */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MarkdownViewer content={compiledMarkdownReport} allowToggleTasks={false} />
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
