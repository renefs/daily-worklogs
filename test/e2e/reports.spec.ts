import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from './fixtures/electronApp';

test('drills down from annual activity to a daily note and supports narrow layouts', async ({ page, testVaultDir }) => {
  fs.mkdirSync(path.join(testVaultDir, '2026'), { recursive: true });
  fs.writeFileSync(path.join(testVaultDir, '2026', '2026-10-01.md'), '# Worklog\n\n- [x] Review release notes\n- [ ] Prepare release\n');
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  await page.getByTestId('report-period-type').getByText('Year', { exact: true }).click();
  await page.getByTestId('report-period-picker').click();
  await page.getByRole('dialog').getByRole('button', { name: '2026', exact: true }).click();
  await expect(page.getByText('1 of 365', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Oct 2026', exact: true }).click();
  await expect(page.getByTestId('report-period-picker')).toHaveText('October 2026');
  await page.getByRole('button', { name: 'Open the week containing 2026-10-01', exact: true }).click();
  await expect(page.getByTestId('report-period-picker')).toHaveText('28 Sep – 4 Oct 2026');
  await expect(page.getByText('1 of 7', { exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Overview' })).toBeVisible();
  await page.screenshot({ path: '/private/tmp/worklog-reports-desktop.png' });
  await page.getByRole('button', { name: 'Open daily note for 2026-10-01' }).click();
  await expect(page.locator('.cm-content')).toContainText('Review release notes');
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByTestId('report-period-picker')).toHaveText('28 Sep – 4 Oct 2026');
  for (const width of [736, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId('report-period-picker')).toBeVisible();
    // AppShell animates its sidebar offset after a viewport resize.
    await expect.poll(async () => page.getByTestId('report-content').evaluate((el) => el.clientWidth)).toBeGreaterThan(width - 50);
    const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    const layout = await page.evaluate(() => {
      const content = document.querySelector('[data-testid="report-content"]')!;
      const header = document.querySelector('header')!.getBoundingClientRect();
      const navigation = Array.from(document.querySelectorAll('header nav button')).map((button) => button.getBoundingClientRect());
      return { contentWidth: content.clientWidth, contentScrollWidth: content.scrollWidth,
        navigationFits: navigation.every((rect) => rect.top >= header.top && rect.bottom <= header.bottom && rect.right <= window.innerWidth) };
    });
    expect(layout.contentScrollWidth).toBeLessThanOrEqual(layout.contentWidth);
    expect(layout.navigationFits).toBe(true);
  }
  await page.screenshot({ path: '/private/tmp/worklog-reports-mobile.png' });
  await page.getByTestId('report-period-picker').click();
  await page.getByRole('dialog').getByRole('button', { name: '1 October 2026', exact: true }).click();
  await expect(page.getByTestId('report-period-picker')).toHaveAttribute('aria-expanded', 'false');
});


test('respects Spanish labels, dark appearance, and Sunday-start reporting', async ({ page, testVaultDir }) => {
  fs.mkdirSync(path.join(testVaultDir, '2026'), { recursive: true });
  fs.writeFileSync(path.join(testVaultDir, '2026', '2026-10-01.md'), '# Worklog\n\n- [x] Review release notes\n');
  await page.evaluate(async () => {
    const settings = await window.electronAPI.getSettings();
    await window.electronAPI.saveSettings({ ...settings, language: 'es', colorScheme: 'dark', weekStartDay: 0 });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Informes', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark');
  await page.getByTestId('report-period-type').getByText('Mes', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeVisible();
  await page.getByTestId('report-period-type').getByText('Semana', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Semana anterior' })).toBeVisible();
  await expect(page.getByTestId('report-period-picker')).not.toContainText('reports.');
  await page.getByTestId('report-period-picker').click();
  const picker = page.getByRole('dialog');
  const weekday = picker.locator('thead th').first();
  await expect(weekday).toHaveText('do');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('report-period-picker')).toBeFocused();
  await page.getByTestId('report-period-picker').click();
  await page.getByRole('dialog').getByRole('button', { name: '1 octubre 2026', exact: true }).click();
  await expect(page.locator('[data-tone]')).toHaveCount(3);
  await page.screenshot({ path: '/private/tmp/worklog-reports-dark-spanish.png' });
});
