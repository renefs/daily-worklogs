import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMantine } from '../utils/test-utils';
import { PeriodHeaderNav, type PeriodHeaderNavProps } from '../../src/components/views/period/PeriodHeaderNav';

function props(period: PeriodHeaderNavProps['period'] = 'week'): PeriodHeaderNavProps {
  return { date: '2026-10-01', period, weekStartDay: 1, onDateChange: vi.fn(), onPeriodChange: vi.fn(),
    onExport: vi.fn(), onCopyReport: vi.fn(), activeTab: 'dashboard', onTabChange: vi.fn() };
}

describe('Report header navigation', () => {
  it('labels period navigation and opens a functioning week picker', async () => {
    const p = props();
    renderWithMantine(<PeriodHeaderNav {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(p.onDateChange).toHaveBeenCalledWith('2026-09-24');
    fireEvent.click(screen.getByRole('button', { name: /choose period/i }));
    expect(screen.getByRole('button', { name: /choose period/i })).toHaveAttribute('aria-expanded', 'true');
    const day = await screen.findByRole('button', { name: '1 October 2026' });
    fireEvent.click(day);
    expect(p.onDateChange).toHaveBeenLastCalledWith('2026-10-01');
  });
  it('selects a month directly and delegates period and section changes', async () => {
    const p = props('month');
    renderWithMantine(<PeriodHeaderNav {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /choose period/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sep', exact: true }));
    expect(p.onDateChange).toHaveBeenCalledWith('2026-09-01');
    fireEvent.click(screen.getByText('Year', { exact: true }));
    expect(p.onPeriodChange).toHaveBeenCalledWith('year');
    fireEvent.click(screen.getByRole('tab', { name: 'Entries' }));
    expect(p.onTabChange).toHaveBeenCalledWith('days');
  });
  it('selects a year directly and hides the Entries tab for yearly reports', async () => {
    const p = props('year');
    renderWithMantine(<PeriodHeaderNav {...p} />);
    expect(screen.queryByRole('tab', { name: 'Entries' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /choose period/i }));
    fireEvent.click(await screen.findByRole('button', { name: '2024', exact: true }));
    expect(p.onDateChange).toHaveBeenCalledWith('2024-01-01');
  });
});
