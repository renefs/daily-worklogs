import React, { useState, useMemo } from 'react';
import {
  Group,
  Stack,
  Text,
  Badge,
  Card,
  Paper,
  ActionIcon,
  Button,
  Tooltip,
  TextInput,
  Switch,
  Collapse,
  ThemeIcon,
  CloseButton,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconCheck,
  IconEdit,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconNotes,
  IconPlus,
  IconChecklist,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { PeriodSummary, WorklogDaySummary } from '../../types';
import { MarkdownViewer } from '../viewer/MarkdownViewer';
import { useAppStoreSelector } from '../../store/useAppStore';
import { formatLocalizedDateTitle } from '../../utils/dateFormat';

interface PeriodDaysListProps {
  periodSummary: PeriodSummary | null;
}

export const PeriodDaysList: React.FC<PeriodDaysListProps> = ({ periodSummary }) => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { openReportDay, readReportDay, reportPeriod, reportDaysExpanded, setReportDaysExpanded } = useAppStoreSelector((state) => ({
    openReportDay: state.openReportDay,
    readReportDay: state.readReportDay,
    reportPeriod: state.reportPeriod,
    reportDaysExpanded: state.reportDaysExpanded,
    setReportDaysExpanded: state.setReportDaysExpanded,
  }));

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithNotes, setOnlyWithNotes] = useState(true);
  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  const [loadedContent, setLoadedContent] = useState<Record<string, string>>({});

  const daysList: WorklogDaySummary[] = useMemo(() => {
    return (periodSummary?.days || []).map((day) => ({
      ...day,
      content: day.content ?? loadedContent[day.date],
    }));
  }, [periodSummary, loadedContent]);

  // Track collapsed state per date (default expanded when reportDaysExpanded is active on week/month)
  const defaultExpanded = reportDaysExpanded && reportPeriod !== 'year';
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const isDayCollapsed = (date: string): boolean => {
    if (date in collapsedMap) return collapsedMap[date];
    return !defaultExpanded;
  };

  const loadDayContent = async (date: string): Promise<string> => {
    if (loadedContent[date] !== undefined) return loadedContent[date];
    const existing = periodSummary?.days.find((d) => d.date === date)?.content;
    if (existing !== undefined) {
      setLoadedContent((current) => ({ ...current, [date]: existing }));
      return existing;
    }
    const content = await readReportDay(date);
    setLoadedContent((current) => ({ ...current, [date]: content }));
    return content;
  };

  const toggleDayCollapse = async (date: string) => {
    const isCurrentlyCollapsed = isDayCollapsed(date);
    if (isCurrentlyCollapsed) await loadDayContent(date);
    setCollapsedMap((prev) => ({
      ...prev,
      [date]: !isCurrentlyCollapsed,
    }));
  };

  const handleExpandAll = async () => {
    if (reportPeriod !== 'year') {
      setReportDaysExpanded(true);
    }
    await Promise.all(daysList.filter((day) => day.exists).map((day) => loadDayContent(day.date)));
    const newMap: Record<string, boolean> = {};
    daysList.forEach((d) => {
      newMap[d.date] = false;
    });
    setCollapsedMap(newMap);
  };

  const handleCollapseAll = () => {
    setReportDaysExpanded(false);
    const newMap: Record<string, boolean> = {};
    daysList.forEach((d) => {
      newMap[d.date] = true;
    });
    setCollapsedMap(newMap);
  };

  const showSearchBar = reportPeriod !== 'week';

  // Filtered list of days
  const filteredDays = useMemo(() => {
    const query = showSearchBar ? searchQuery.trim().toLowerCase() : '';
    return daysList.filter((day) => {
      const hasContent = day.exists;
      if (onlyWithNotes && !hasContent) {
        return false;
      }
      if (!query) return true;

      const dateMatches = day.date.toLowerCase().includes(query);
      const contentMatches = (day.content || '').toLowerCase().includes(query);
      const dayFormatted = dayjs(day.date)
        .locale(i18n.language === 'es' ? 'es' : 'en')
        .format('dddd MMMM D YYYY')
        .toLowerCase();

      return dateMatches || contentMatches || dayFormatted.includes(query);
    });
  }, [daysList, onlyWithNotes, searchQuery, showSearchBar, i18n.language]);

  const handleCopyDayMarkdown = async (day: WorklogDaySummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const markdownToCopy = day.content ?? await loadDayContent(day.date);
    if (!markdownToCopy.trim()) {
      notifications.show({
        title: t('reports.noContentForDay'),
        message: t('reports.noNoteForDay'),
        color: 'orange',
      });
      return;
    }

    navigator.clipboard.writeText(markdownToCopy);
    setCopiedDate(day.date);

    setTimeout(() => {
      setCopiedDate((curr) => (curr === day.date ? null : curr));
    }, 2000);

    const formattedDate = formatLocalizedDateTitle(day.date, i18n.language);

    notifications.show({
      title: t('reports.dayCopied'),
      message: t('reports.dayCopiedDesc', { date: formattedDate }),
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const handleOpenInDaily = (date: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    void openReportDay(date);
  };

  const todayStr = dayjs().format('YYYY-MM-DD');

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      {/* Controls & Filter Bar */}
      <Paper
        p="sm"
        withBorder
        radius="md"
        style={{
          backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm" style={{ flex: 1, minWidth: showSearchBar ? 260 : undefined }}>
            {showSearchBar && (
              <TextInput
                placeholder={t('reports.searchDays')}
                leftSection={<IconSearch size={16} />}
                rightSection={
                  searchQuery ? (
                    <CloseButton
                      size="xs"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('reports.clearSearch')}
                    />
                  ) : null
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.currentTarget.value);
                  if (e.currentTarget.value.trim()) {
                    void Promise.all(daysList.filter((day) => day.exists).map((day) => loadDayContent(day.date)));
                  }
                }}
                size="xs"
                radius="md"
                style={{ flex: 1 }}
              />
            )}
            <Switch
              label={t('reports.filterWithNotes')}
              checked={onlyWithNotes}
              onChange={(e) => setOnlyWithNotes(e.currentTarget.checked)}
              size="xs"
            />
          </Group>

          <Group gap="xs">
            <Button variant="subtle" size="xs" onClick={handleExpandAll}>
              {t('reports.expandAll')}
            </Button>
            <Button variant="subtle" size="xs" onClick={handleCollapseAll}>
              {t('reports.collapseAll')}
            </Button>
            <Badge variant="light" color="blue" size="md">
              {filteredDays.length} {filteredDays.length === 1 ? t('reports.daySingular') : t('reports.daysPlural')}
            </Badge>
          </Group>
        </Group>
      </Paper>

      {filteredDays.length > 0 && (
        <Text size="xs" c="dimmed">
          {t('reports.notesExcludedHint')}
        </Text>
      )}

      {/* Days List */}
      <div data-testid="report-days-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Stack gap="sm">
          {filteredDays.length === 0 ? (
            <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
              <Stack align="center" gap="xs">
                <ThemeIcon size={44} radius="xl" variant="light" color="gray">
                  <IconNotes size={24} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {t('reports.noDaysFound')}
                </Text>
                <Text size="xs" c="dimmed">
                  {onlyWithNotes ? t('reports.tryDisablingFilter') : t('monthly.noNotes')}
                </Text>
              </Stack>
            </Card>
          ) : (
            filteredDays.map((day) => {
              const isToday = day.date === todayStr;
              const hasContent = day.exists && (day.content || '').trim().length > 0;
              const isCollapsed = isDayCollapsed(day.date);
              const isCopied = copiedDate === day.date;

              const dayName = formatLocalizedDateTitle(day.date, i18n.language);

              const checklistDone = (day.checklistItems || []).filter((i) => i.completed).length;
              const checklistTotal = (day.checklistItems || []).length;

              return (
                <Card
                  key={day.date}
                  withBorder
                  radius="md"
                  p={0}
                  style={{
                    borderColor: isToday
                      ? 'var(--mantine-color-primary-filled)'
                      : undefined,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Day Header */}
                  <div
                    onClick={() => toggleDayCollapse(day.date)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark
                        ? isToday
                          ? 'var(--mantine-color-dark-5)'
                          : 'var(--mantine-color-dark-6)'
                        : isToday
                        ? 'var(--mantine-color-blue-0)'
                        : 'var(--mantine-color-gray-1)',
                      borderBottom: isCollapsed
                        ? 'none'
                        : isDark
                        ? '1px solid var(--mantine-color-dark-4)'
                        : '1px solid var(--mantine-color-gray-3)',
                    }}
                  >
                    <Group gap="xs" align="center" wrap="wrap">
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        color="gray"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDayCollapse(day.date);
                        }}
                      >
                        {isCollapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
                      </ActionIcon>

                      <Text fw={600} size="sm" style={{ textTransform: 'capitalize' }}>
                        {dayName}
                      </Text>

                      <Badge variant="outline" size="xs" color="gray">
                        {day.date}
                      </Badge>

                      {isToday && (
                        <Badge variant="filled" color="blue" size="xs">
                          {t('common.today')}
                        </Badge>
                      )}

                      {checklistTotal > 0 && (
                        <Badge
                          variant="light"
                          color={checklistDone === checklistTotal ? 'teal' : 'orange'}
                          size="xs"
                          leftSection={<IconChecklist size={12} />}
                        >
                          {checklistDone}/{checklistTotal}
                        </Badge>
                      )}

                      {day.tasksTotal > 0 && (
                        <Badge variant="light" color="indigo" size="xs">
                          {day.tasksCompleted}/{day.tasksTotal} {t('reports.tasksDone')}
                        </Badge>
                      )}
                    </Group>

                    {/* Action buttons: Copy & Open Editor */}
                    <Group gap="xs" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                      <Tooltip label={t('reports.copyDayTooltip')} withArrow position="top">
                        <Button
                          variant={isCopied ? 'filled' : 'light'}
                          color={isCopied ? 'teal' : 'primary'}
                          size="xs"
                          radius="md"
                          leftSection={isCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          onClick={(e) => handleCopyDayMarkdown(day, e)}
                          disabled={!day.exists}
                        >
                          {isCopied ? t('common.copied') : t('reports.copyDay')}
                        </Button>
                      </Tooltip>

                      <Tooltip label={t('reports.openInEditor')} withArrow position="top">
                        <ActionIcon
                          variant="default"
                          size="sm"
                          radius="md"
                          aria-label={t('reports.openInEditor')}
                          onClick={(e) => handleOpenInDaily(day.date, e)}
                        >
                          <IconEdit size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </div>

                  {/* Day Markdown Content Preview */}
                  <Collapse in={!isCollapsed}>
                    <div style={{ padding: 12 }}>
                      {hasContent ? (
                        <MarkdownViewer content={day.content || ''} allowToggleTasks={false} />
                      ) : (
                        <Group justify="space-between" align="center" p="xs">
                          <Text size="xs" c="dimmed">
                            {t('reports.noNoteForDay')}
                          </Text>
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => handleOpenInDaily(day.date)}
                          >
                            {t('reports.createNoteForDay')}
                          </Button>
                        </Group>
                      )}
                    </div>
                  </Collapse>
                </Card>
              );
            })
          )}
        </Stack>
      </div>
    </Stack>
  );
};
