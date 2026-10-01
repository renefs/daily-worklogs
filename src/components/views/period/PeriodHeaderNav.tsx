import { useState } from 'react';
import { ActionIcon, Button, Group, Popover, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core';
import { DatePicker, MonthPicker, YearPicker } from '@mantine/dates';
import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight, IconCopy, IconFileExport } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ReportPeriod, ReportTab } from '../../../types';
import { formatReportPeriod, getReportRange, moveReportDate } from '../../../utils/reportPeriod';
import classes from './PeriodHeaderNav.module.css';

export interface PeriodHeaderNavProps {
  date: string;
  period: ReportPeriod;
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onDateChange: (date: string) => void;
  onPeriodChange: (period: ReportPeriod) => void;
  onExport: () => void;
  onCopyReport: () => void;
  exportDisabled?: boolean;
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function PeriodHeaderNav({ date, period, weekStartDay, onDateChange, onPeriodChange,
  onExport, onCopyReport, exportDisabled, activeTab, onTabChange }: PeriodHeaderNavProps) {
  const { t, i18n } = useTranslation();
  const [pickerOpened, setPickerOpened] = useState(false);
  const locale = i18n.language === 'es' ? 'es' : 'en';
  const range = getReportRange(date, period, weekStartDay);
  const label = formatReportPeriod(date, period, weekStartDay, locale);
  const pickDate = (value: Date | null) => {
    if (!value) return;
    onDateChange(dayjs(value).format('YYYY-MM-DD'));
    setPickerOpened(false);
  };
  return (
    <Stack gap="lg" className={classes.header}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2} className={classes.title}>{t('nav.reports')}</Title>
          <Text size="sm" c="dimmed" mt={4}>{t('reports.workspaceDescription')}</Text>
        </div>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconCopy size={16} />} onClick={onCopyReport} disabled={exportDisabled}>
            {t('weekly.copyReport')}
          </Button>
          <Button variant="default" leftSection={<IconFileExport size={16} />} onClick={onExport} disabled={exportDisabled}>
            {t('weekly.exportReport')}
          </Button>
        </Group>
      </Group>
      <Group justify="space-between" gap="md" className={classes.toolbar}>
        <SegmentedControl data-testid="report-period-type" aria-label={t('reports.periodType')} value={period} className={classes.periodType}
          onChange={(value) => {
            if (value === 'week' || value === 'month' || value === 'year') {
              setPickerOpened(false);
              onPeriodChange(value);
            }
          }}
          data={(['week', 'month', 'year'] as const).map((value) => ({ value, label: t(`reports.period.${value}`) }))} />
        <Group gap={6} className={classes.navigation}>
          <ActionIcon variant="default" size="lg" aria-label={t(`reports.previous.${period}`)}
            onClick={() => { setPickerOpened(false); onDateChange(moveReportDate(date, period, -1)); }}>
            <IconChevronLeft size={17} />
          </ActionIcon>
          <Popover opened={pickerOpened} onChange={setPickerOpened} position="bottom-end" trapFocus returnFocus withinPortal>
            <Popover.Target>
              <Button variant="default" className={classes.dateButton} data-testid="report-period-picker"
                leftSection={<IconCalendar size={16} />} rightSection={<IconChevronDown size={14} />}
                aria-label={t('reports.choosePeriod', { period: label })} aria-expanded={pickerOpened}
                onClick={() => setPickerOpened(!pickerOpened)}>{label}</Button>
            </Popover.Target>
            <Popover.Dropdown p="sm" role="dialog" aria-label={t('reports.periodPicker')}>
              {period === 'week' ? (
                <DatePicker key={date} locale={locale} firstDayOfWeek={weekStartDay}
                  value={dayjs(date).toDate()} defaultDate={dayjs(date).toDate()} onChange={pickDate}
                  getDayProps={(day) => {
                    const iso = dayjs(day).format('YYYY-MM-DD');
                    return { inRange: iso >= range.start && iso <= range.end, firstInRange: iso === range.start, lastInRange: iso === range.end };
                  }} />
              ) : period === 'month' ? (
                <MonthPicker key={date} locale={locale} value={dayjs(date).toDate()}
                  defaultDate={dayjs(date).toDate()} onChange={pickDate} />
              ) : (
                <YearPicker key={date} locale={locale} value={dayjs(date).toDate()}
                  defaultDate={dayjs(date).toDate()} onChange={pickDate} />
              )}
            </Popover.Dropdown>
          </Popover>
          <ActionIcon variant="default" size="lg" aria-label={t(`reports.next.${period}`)}
            onClick={() => { setPickerOpened(false); onDateChange(moveReportDate(date, period, 1)); }}>
            <IconChevronRight size={17} />
          </ActionIcon>
          <Button variant="subtle" onClick={() => { setPickerOpened(false); onDateChange(dayjs().format('YYYY-MM-DD')); }}>
            {t(`reports.current.${period}`)}
          </Button>
        </Group>
      </Group>
      <Tabs id="report" value={activeTab} onChange={(value) => {
        if (value === 'dashboard' || value === 'days' || value === 'tasks') onTabChange(value);
      }}>
        <Tabs.List>
          <Tabs.Tab value="dashboard">{t('dashboard.summary')}</Tabs.Tab>
          <Tabs.Tab value="days">{t('reports.entriesTab')}</Tabs.Tab>
          <Tabs.Tab value="tasks">{t('nav.tasks')}</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Stack>
  );
}
