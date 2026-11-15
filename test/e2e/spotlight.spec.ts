import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Spotlight vault search', () => {
  test('scrolls long result lists and keeps keyboard selection working', async ({ page, testVaultDir }) => {
    const yearDir = path.join(testVaultDir, '2026');
    const tasksDir = path.join(testVaultDir, 'tasks');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.mkdirSync(tasksDir, { recursive: true });
    for (let day = 1; day <= 25; day++) {
      const date = `2026-03-${String(day).padStart(2, '0')}`;
      fs.writeFileSync(path.join(yearDir, `${date}.md`), `# ${date}\n\nPaired on the gateway rollout.\n`, 'utf-8');
    }
    fs.writeFileSync(
      path.join(tasksDir, 'gateway.md'),
      '---\ntaskId: 3\ntitle: Gateway rollout checklist\nstatus: todo\n---\n\nVerify gateway health.\n',
      'utf-8'
    );

    await expect(page.locator('#root')).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    const search = page.getByPlaceholder('Type a command, date, or search vault...');
    await expect(search).toBeVisible();
    await search.fill('gateway');

    const content = page.locator('.mantine-Spotlight-content');
    const task = content.getByText('Gateway rollout checklist');
    await expect(task).toHaveCount(1, { timeout: 10000 });
    // Notes are capped per type, so they never crowd tasks out of the list.
    await expect(content.locator('[data-action]', { hasText: 'Paired on the gateway rollout.' })).toHaveCount(20);

    // The list is height-bounded and scrollable instead of overflowing the window.
    const viewport = content.locator('[data-offset-scrollbars]');
    const metrics = await viewport.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    const contentBox = await content.boundingBox();
    const windowHeight = await page.evaluate(() => window.innerHeight);
    expect(contentBox && contentBox.y + contentBox.height).toBeLessThanOrEqual(windowHeight);

    await viewport.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(task).toBeInViewport();

    // The first result is selected once results arrive, so Enter opens the newest matching note.
    await expect(content.locator('[data-action][data-selected]')).toContainText('2026-03-25');
    await search.press('Enter');
    await expect(content).toBeHidden();
    await expect(page.locator('#root').getByText('Paired on the gateway rollout.').first()).toBeVisible();
  });
});
