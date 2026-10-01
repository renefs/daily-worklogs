import { ActionIcon, Popover, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarEvent } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import classes from './SidebarCalendar.module.css';

interface SidebarCalendarProps {
  selectedDate: string;
  notesDateSet: Set<string>;
  locale: 'en' | 'es';
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onSelectDate: (date: string) => void;
}

export function SidebarCalendar({ selectedDate, notesDateSet, locale, weekStartDay, onSelectDate }: SidebarCalendarProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  return <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="sm" radius="lg">
    <Popover.Target>
      <Tooltip label={t('nav.chooseNoteDate')} disabled={opened}>
        <ActionIcon variant="subtle" color="gray" aria-label={t('nav.chooseNoteDate')} aria-expanded={opened}
          onClick={() => setOpened(!opened)}><IconCalendarEvent size={18} /></ActionIcon>
      </Tooltip>
    </Popover.Target>
    <Popover.Dropdown data-testid="daily-calendar">
      <DatePicker locale={locale} value={dayjs(selectedDate).toDate()} size="sm" firstDayOfWeek={weekStartDay}
        onChange={(value) => { if (value) { onSelectDate(dayjs(value).format('YYYY-MM-DD')); setOpened(false); } }}
        renderDay={(date) => {
          const dateStr = dayjs(date).format('YYYY-MM-DD');
          return <span className={classes.day} data-selected={dateStr === selectedDate || undefined}>
            {date.getDate()}{notesDateSet.has(dateStr) && <span className={classes.dot} />}
          </span>;
        }} />
    </Popover.Dropdown>
  </Popover>;
}
