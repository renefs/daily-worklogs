import { test, expect } from './fixtures/electronApp';

test.describe('Application Launch & View Navigation', () => {
  test('launches successfully with correct title and branding', async ({ page }) => {
    expect(await page.title()).toBe('Daily Worklog');
    await expect(page.getByText('Worklog', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible();
  });

  test('navigates between Daily, Reports, and Tasks with a shared report period', async ({ page }) => {
    await page.getByRole('button', { name: 'Choose note date', exact: true }).click();
    await expect(page.getByTestId('daily-calendar')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByTestId('daily-calendar')).toHaveCount(0);
    await page.getByTestId('report-period-type').getByText('Month', { exact: true }).click();
    const month = await page.getByTestId('report-period-picker').textContent();
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(page.getByTestId('report-period-picker')).not.toHaveText(month!);
    const previousMonth = await page.getByTestId('report-period-picker').textContent();
    await page.getByRole('tab', { name: 'Entries' }).click();
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByTestId('report-period-picker')).toHaveText(previousMonth!);
    await expect(page.getByRole('tab', { name: 'Entries' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Daily', exact: true }).click();
    await page.getByRole('button', { name: 'Choose note date', exact: true }).click();
    await expect(page.getByTestId('daily-calendar')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('keeps history available across views and restores it after collapsing the sidebar', async ({ page }) => {
    await expect(page.getByText('Notes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByText('Notes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect(page.getByText('Notes', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
    await expect(page.getByText('Notes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Open settings', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('opens period pickers and navigates across years', async ({ page }) => {
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await page.getByTestId('report-period-type').getByText('Year', { exact: true }).click();
    await page.getByTestId('report-period-picker').click();
    const picker = page.getByRole('dialog', { name: /Choose period:/ });
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: '2026', exact: true }).click();
    await expect(page.getByTestId('report-period-picker')).toHaveText('2026');
    await page.getByTestId('report-period-type').getByText('Month', { exact: true }).click();
    await page.getByTestId('report-period-picker').click();
    await picker.getByRole('button', { name: 'Dec', exact: true }).click();
    await expect(page.getByTestId('report-period-picker')).toHaveText('December 2026');
    await page.getByTestId('report-period-type').getByText('Week', { exact: true }).click();
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.getByTestId('report-period-picker')).toHaveText('28 Dec 2026 – 3 Jan 2027');
    await expect(page.getByRole('heading', { name: 'No work recorded for this period' })).toBeVisible();
  });
});
