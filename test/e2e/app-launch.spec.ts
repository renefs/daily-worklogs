import { test, expect } from './fixtures/electronApp';

test.describe('Application Launch & View Navigation', () => {
  test('launches successfully with correct title and branding', async ({ page }) => {
    // Check Electron window title
    const title = await page.title();
    expect(title).toBe('Daily Worklog');

    // Verify main header branding with exact text matching
    await expect(page.getByText('Worklog', { exact: true })).toBeVisible();

    // Verify Settings button is present
    await expect(page.locator('button[aria-label="Open settings"]')).toBeVisible();
  });

  test('navigates seamlessly between Daily, Weekly, Monthly, and Tasks views', async ({ page }) => {
    // Initially on Daily view
    await expect(page.locator('.header-segmented-control')).toBeVisible();

    // Switch to Weekly view
    await page.click('.header-segmented-control label:has-text("Weekly")');
    await expect(page.locator('.header-segmented-control input[value="weekly"]')).toBeChecked();

    // Switch to Monthly view
    await page.click('.header-segmented-control label:has-text("Monthly")');
    await expect(page.locator('.header-segmented-control input[value="monthly"]')).toBeChecked();

    // Switch to Tasks view
    await page.click('.header-tasks-button');
    await expect(page.locator('.header-tasks-button')).toHaveAttribute('data-active', 'true');

    // Switch back to Daily view
    await page.click('.header-segmented-control label:has-text("Daily")');
    await expect(page.locator('.header-segmented-control input[value="daily"]')).toBeChecked();
  });
});
