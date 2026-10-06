import { Paper } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import classes from './SidebarCalendar.module.css';

interface SidebarCalendarProps {
  selectedDate: string;
  notesDateSet: Set<string>;
  locale: 'en' | 'es';
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onSelectDate: (date: string) => void;
}

export function SidebarCalendar({ selectedDate, notesDateSet, locale, weekStartDay, onSelectDate }: SidebarCalendarProps) {
  return (
    <Paper p="xs" radius="md" className={classes.calendarCard} data-testid="daily-calendar">
      <DatePicker
        locale={locale}
        value={dayjs(selectedDate).toDate()}
        size="xs"
        firstDayOfWeek={weekStartDay}
        onChange={(value) => {
          if (value) {
            onSelectDate(dayjs(value).format('YYYY-MM-DD'));
          }
        }}
        renderDay={(date) => {
          const dateStr = dayjs(date).format('YYYY-MM-DD');
          return (
            <span
              className={classes.day}
              data-selected={dateStr === selectedDate || undefined}
              data-has-note={notesDateSet.has(dateStr) || undefined}
            >
              {date.getDate()}
              {notesDateSet.has(dateStr) && <span className={classes.dot} />}
            </span>
          );
        }}
      />
    </Paper>
  );
}
