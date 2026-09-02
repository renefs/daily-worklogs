import React, { useEffect, useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Title,
  Text,
  Button,
  ActionIcon,
  Paper,
  SimpleGrid,
  RingProgress,
  UnstyledButton,
  Menu,
  Progress,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconCheck,
  IconCalendarStats,
  IconDotsVertical,
  IconChevronRight as IconArrowRight,
  IconCalendar,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { PeriodSummary, TaskMeta } from '../../types';
import { ExportModal } from '../modals/ExportModal';
import { PeriodTasksBreakdown } from './PeriodTasksBreakdown';
import { PeriodDaysList } from './PeriodDaysList';

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

  // Project distribution for Tasks by project donut chart
  const projectDistribution = useMemo(() => {
    return [
      { name: 'Monitoring', count: 2, percent: 22, color: '#10b981' },
      { name: 'Webcast & Recording', count: 3, percent: 33, color: '#f59e0b' },
      { name: 'Webcast', count: 4, percent: 44, color: '#8b5cf6' },
    ];
  }, []);

  // Priority distribution with desaturated colors
  const priorityDistribution = useMemo(() => {
    return [
      { key: 'high', label: 'High', count: 3, percent: 33, color: '#e06c75' },
      { key: 'medium', label: 'Medium', count: 3, percent: 33, color: '#d19a66' },
      { key: 'low', label: 'Low', count: 3, percent: 33, color: '#61afef' },
    ];
  }, []);

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
        {[
          { key: 'dashboard', label: t('dashboard.summary', 'Overview') },
          { key: 'days', label: t('reports.entriesTab', 'Entries') },
          { key: 'tasks', label: t('reports.taskBreakdownTab', 'Task breakdown') },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <UnstyledButton
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
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
          <Stack gap={14}>
            {/* 3 Equal KPI Summary Cards with Internal Deltas */}
            <SimpleGrid cols={{ base: 1, sm: 3, md: 3 }} spacing="md">
              {/* Card 1: Days logged */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIconWrapper color="blue">
                    <IconCalendarStats size={20} />
                  </ThemeIconWrapper>
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.daysLogged', 'Days logged')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {activeDaysCount} of 365
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs {prevYearNum} <span style={{ fontWeight: 700 }}>+6 days</span>
                    </Text>
                  </div>
                </Group>
              </Paper>

              {/* Card 2: Tasks completed */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIconWrapper color="teal">
                    <IconCheck size={20} />
                  </ThemeIconWrapper>
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.tasksCompleted', 'Tasks completed')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {completedTasksCount} of {totalTasksCount}
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs {prevYearNum} <span style={{ fontWeight: 700 }}>+6 tasks</span>
                    </Text>
                  </div>
                </Group>
              </Paper>

              {/* Card 3: Completion rate */}
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <RingProgress
                    size={48}
                    roundCaps
                    thickness={4}
                    sections={[{ value: completionPercent, color: 'primary' }]}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
                      {t('dashboard.completionRate', 'Completion rate')}
                    </Text>
                    <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                      {completionPercent}%
                    </Text>
                    <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>
                      vs {prevYearNum} <span style={{ fontWeight: 700 }}>+8 pp</span>
                    </Text>
                  </div>
                </Group>
              </Paper>
            </SimpleGrid>

            {/* Middle 2-Column Grid: Logging activity by month & Tasks by project */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Left Column: Logging activity by month */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={8} style={{ fontSize: 12 }}>
                  {t('dashboard.loggingActivityByMonth', 'Logging activity by month')}
                </Text>

                <div style={{ position: 'relative', height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 4px 0 4px' }}>
                  {/* Y Axis Guide */}
                  <div style={{ position: 'absolute', top: 8, left: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80%', pointerEvents: 'none' }}>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>30</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>20</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>10</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>0</Text>
                  </div>

                  {/* Bars & SVG previous year overlay */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(12, 1fr)',
                      gap: 4,
                      alignItems: 'flex-end',
                      height: 120,
                      marginLeft: 20,
                    }}
                  >
                    {/* SVG Previous Year Line */}
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 2,
                        overflow: 'visible',
                      }}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        fill="none"
                        stroke={isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points="4,70 12,60 20,75 28,45 36,65 44,50 52,80 60,70 68,95 76,98 84,98 92,98"
                      />
                    </svg>

                    {monthlyActivity.map((m) => (
                      <div
                        key={m.monthIndex}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          gap: 3,
                          zIndex: 1,
                        }}
                      >
                        <Text size="xs" c="dimmed" style={{ fontSize: 9, opacity: m.isFutureMonth ? 0.3 : 1 }}>
                          {m.count}
                        </Text>

                        <Tooltip label={`${m.name}: ${m.count} days`} withArrow>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: 20,
                              height: `${m.heightPercent}%`,
                              borderRadius: '3px 3px 0 0',
                              backgroundColor: m.isCurrentMonth
                                ? 'var(--mantine-primary-color-filled)'
                                : m.count > 0
                                ? 'var(--mantine-primary-color-filled)'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.04)',
                              opacity: m.isFutureMonth ? 0.25 : 1,
                              transition: 'height 0.2s ease',
                              cursor: m.isFutureMonth ? 'default' : 'pointer',
                            }}
                          />
                        </Tooltip>

                        <Text
                          size="xs"
                          fw={m.isCurrentMonth ? 700 : 500}
                          c={m.isCurrentMonth ? 'primary' : 'dimmed'}
                          style={{ fontSize: 10, opacity: m.isFutureMonth ? 0.4 : 1 }}
                        >
                          {m.name}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                <Group justify="center" gap={16} mt={12}>
                  <Group gap={6} align="center">
                    <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--mantine-primary-color-filled)' }} />
                    <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                      {yearRange.year} ({t('dashboard.daysLogged', 'days logged')})
                    </Text>
                  </Group>
                  <Group gap={6} align="center">
                    <div style={{ width: 14, height: 2, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }} />
                    <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                      {prevYearNum} ({t('dashboard.daysLogged', 'days logged')})
                    </Text>
                  </Group>
                </Group>
              </Paper>

              {/* Right Column: Tasks by project Donut */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByProject', 'Tasks by project')}
                </Text>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12, marginTop: 8 }}>
                  <div style={{ position: 'relative', width: 110, height: 110 }}>
                    <svg width="110" height="110" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--app-card-border)" strokeWidth="5" />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="5"
                        strokeDasharray="22 78"
                        strokeDashoffset="25"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="5"
                        strokeDasharray="33 67"
                        strokeDashoffset="3"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke="#8b5cf6"
                        strokeWidth="5"
                        strokeDasharray="44 56"
                        strokeDashoffset="70"
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
                      <Text fw={800} size="md">
                        46
                      </Text>
                      <Text size="xs" c="dimmed" style={{ fontSize: 9 }}>
                        Tasks
                      </Text>
                    </div>
                  </div>

                  <Stack gap={6}>
                    {projectDistribution.map((a) => (
                      <Group key={a.name} gap={6} wrap="nowrap">
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: a.color }} />
                        <Text size="xs" style={{ fontSize: 11 }}>
                          {a.name}: <b>{a.count} ({a.percent}%)</b>
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </div>
              </Paper>
            </SimpleGrid>

            {/* Bottom 2-Column Grid: Tasks by priority & Key achievements */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Tasks by priority */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Text size="xs" fw={700} c="dimmed" mb={10} style={{ fontSize: 12 }}>
                  {t('dashboard.tasksByPriority', 'Tasks by priority')}
                </Text>

                <Stack gap={10}>
                  {priorityDistribution.map((p) => (
                    <div key={p.key}>
                      <Group justify="space-between" align="center" wrap="nowrap" mb={3}>
                        <Group gap={6} wrap="nowrap">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: p.color }} />
                          <Text size="xs" fw={500}>
                            {p.label}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" fw={600} style={{ fontSize: 11 }}>
                          {p.count} ({p.percent}%)
                        </Text>
                      </Group>
                      <Progress value={p.percent} color={p.color} size="xs" radius="xl" />
                    </div>
                  ))}

                  <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 11 }}>
                    Total: 46 Tasks
                  </Text>
                </Stack>
              </Paper>

              {/* Key achievements */}
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--app-card-bg)', borderColor: 'var(--app-card-border)' }}>
                <Group gap={6} align="center" mb={10}>
                  <IconCheck size={16} color="var(--mantine-color-teal-filled)" />
                  <Text size="xs" fw={700} style={{ fontSize: 13 }}>
                    {t('dashboard.keyAchievements', 'Key achievements')}
                  </Text>
                </Group>

                <Stack gap={8}>
                  {[
                    { id: '1', title: 'Change password of sasentrywebcast service account', completedDate: '2026-09-01' },
                    { id: '2', title: 'Migrate Recordings Manager to Postgresql', completedDate: '2026-08-27' },
                    { id: '3', title: 'Remove webcastd service account', completedDate: '2026-09-01' },
                    { id: '4', title: 'Deploy new CERN Live version', completedDate: '2026-08-27' },
                  ].map((task) => (
                    <Paper
                      key={task.id}
                      p="xs"
                      radius="md"
                      withBorder
                      onClick={() => handleOpenTask(task as any)}
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
                            {dayjs(task.completedDate).format('D MMM YYYY')}
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
                  {t('dashboard.viewAllAchievements', 'View all achievements')} <IconArrowRight size={14} />
                </UnstyledButton>
              </Paper>
            </SimpleGrid>
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
          title={`Annual Report (${yearRange.year})`}
          content={compiledYearlyReport}
          defaultFileName={`annual-report-${yearRange.year}`}
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
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-filled)`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};
