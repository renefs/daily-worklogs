import dayjs from 'dayjs';
import type { AppViewMode, ReportPeriod } from '../types';

export const REPORT_VIEWS: Record<ReportPeriod, AppViewMode> = {
  week: 'weekly', month: 'monthly', year: 'yearly',
};

export function isReportView(view: AppViewMode): boolean {
  return view === 'weekly' || view === 'monthly' || view === 'yearly';
}

export function getReportPeriod(view: AppViewMode): ReportPeriod {
  return view === 'monthly' ? 'month' : view === 'yearly' ? 'year' : 'week';
}

export function getReportRange(date: string, period: ReportPeriod, weekStartDay = 1) {
  const anchor = dayjs(date);
  const start = period === 'week'
    ? anchor.subtract((anchor.day() - weekStartDay + 7) % 7, 'day')
    : anchor.startOf(period);
  const end = period === 'week' ? start.add(6, 'day') : anchor.endOf(period);
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD'), totalDays: end.diff(start, 'day') + 1 };
}

export function formatReportPeriod(date: string, period: ReportPeriod, weekStartDay = 1, locale = 'en'): string {
  const anchor = dayjs(date).locale(locale);
  if (period === 'year') return anchor.format('YYYY');
  if (period === 'month') return anchor.format('MMMM YYYY');
  const range = getReportRange(date, period, weekStartDay);
  const start = dayjs(range.start).locale(locale);
  const end = dayjs(range.end).locale(locale);
  return `${start.format(start.year() === end.year() ? 'D MMM' : 'D MMM YYYY')} – ${end.format('D MMM YYYY')}`;
}

export function moveReportDate(date: string, period: ReportPeriod, direction: -1 | 1): string {
  return dayjs(date).add(direction, period).format('YYYY-MM-DD');
}
