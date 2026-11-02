import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';
import dayjs from 'dayjs';
import type { Page } from '@playwright/test';

const isMac = process.platform === 'darwin';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByTestId('settings-view')).toBeVisible();
}

async function openSection(page: Page, name: string) {
  const nav = page.getByRole('navigation', { name: 'Settings sections' });
  await nav.getByRole('button', { name }).click();
  await expect(nav.getByRole('button', { name })).toHaveAttribute('aria-current', 'page');
}

function writeTask(tasksDir: string, id: number, title: string, status: string, body = 'Body') {
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(
    path.join(tasksDir, `task-${id}.md`),
    `---\ntaskId: ${id}\ntitle: ${title}\nstatus: ${status}\ncreated: ${dayjs().format('YYYY-MM-DD')}\n---\n\n${body}\n`,
    'utf-8'
  );
}

test.describe('Settings page', () => {
  test('opens as a page, and Back or Esc return to the previous view', async ({ page }) => {
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await openSettings(page);
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to Tasks' }).click();
    await expect(page.getByTestId('settings-view')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');

    await openSettings(page);
    // An Esc sent within milliseconds of opening is occasionally lost before the bubble phase; cause unknown.
    await expect(async () => {
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('settings-view')).toHaveCount(0, { timeout: 1000 });
    }).toPass();
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('Esc in a nested editor closes only that editor', async ({ page }) => {
    await openSettings(page);
    await openSection(page, 'Areas & Projects');

    await page.getByRole('button', { name: 'New Area' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('settings-view')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-view')).toHaveCount(0);
  });

  test('Esc closes an open select list without leaving Settings', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('textbox', { name: /Language/ }).click();
    await expect(page.getByRole('listbox')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(page.getByTestId('settings-view')).toBeVisible();
  });

  test('deleting a column with tasks asks where to move them and keeps the tasks reachable', async ({ page, testVaultDir }) => {
    const tasksDir = path.join(testVaultDir, 'tasks');
    await openSettings(page);
    await openSection(page, 'Task Board');
    await page.getByRole('button', { name: 'Add Column' }).click();
    const editor = page.getByRole('dialog');
    await editor.getByLabel('Column Name').fill('Review');
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Delete column Review' })).toBeVisible();

    writeTask(tasksDir, 1, 'Review the proposal', 'review');
    writeTask(tasksDir, 2, 'Review the budget', 'review');
    await page.reload();
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.locator('#root').getByText('Review the proposal')).toBeVisible();

    await openSettings(page);
    await openSection(page, 'Task Board');
    await page.getByRole('button', { name: 'Delete column Review' }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByText('2 tasks use this column')).toBeVisible();

    // Nothing changed on disk before the user confirms
    expect(fs.readFileSync(path.join(tasksDir, 'task-1.md'), 'utf-8')).toContain('status: review');

    await confirm.getByRole('button', { name: 'Move 2 tasks and delete' }).click();
    await expect(page.getByRole('button', { name: 'Delete column Review' })).toHaveCount(0);
    await expect.poll(() => fs.readFileSync(path.join(tasksDir, 'task-1.md'), 'utf-8')).toContain('status: todo');
    expect(fs.readFileSync(path.join(tasksDir, 'task-2.md'), 'utf-8')).toContain('status: todo');

    await page.getByRole('button', { name: 'Back to Tasks' }).click();
    await expect(page.locator('#root').getByText('Review the proposal')).toBeVisible();
    await expect(page.locator('#root').getByText('Review the budget')).toBeVisible();
  });

  test('zero areas persist after a reload', async ({ page, testVaultDir }) => {
    await openSettings(page);
    await openSection(page, 'Areas & Projects');

    for (const name of ['Work', 'General']) {
      await page.getByRole('button', { name: `Delete area ${name}` }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('button', { name: `Delete area ${name}` })).toHaveCount(0);
    }
    await expect(page.getByText('No areas found')).toBeVisible();

    await page.reload();
    await openSettings(page);
    await openSection(page, 'Areas & Projects');
    await expect(page.getByText('No areas found')).toBeVisible();

    const config = JSON.parse(fs.readFileSync(path.join(testVaultDir, '.daily-worklogs', 'config.json'), 'utf-8'));
    expect(config.areas).toEqual([]);
  });

  test('keeps an unsaved daily note when opening Settings and coming back', async ({ page, testVaultDir }) => {
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible({ timeout: 15000 });
    await editor.click();
    await page.keyboard.type('\nTyped right before opening settings');

    await openSettings(page);
    const notePath = path.join(testVaultDir, dayjs().format('YYYY'), `${dayjs().format('YYYY-MM-DD')}.md`);
    await expect.poll(() => fs.existsSync(notePath) && fs.readFileSync(notePath, 'utf-8')).toContain(
      'Typed right before opening settings'
    );

    await page.getByRole('button', { name: 'Back to Daily' }).click();
    await expect(page.locator('.cm-content')).toContainText('Typed right before opening settings');
  });

  test('keeps an unsaved task draft when opening Settings, and Back returns to the task', async ({ page, testVaultDir }) => {
    const tasksDir = path.join(testVaultDir, 'tasks');
    writeTask(tasksDir, 1, 'Draft survives settings', 'todo', 'Original body');
    await page.reload();
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await page.locator('#root').getByText('Draft survives settings').click();

    const title = page.getByPlaceholder('What needs to be done?');
    await expect(title).toHaveValue('Draft survives settings');
    await title.fill('Draft survives settings and more');

    await openSettings(page);
    await expect.poll(() => fs.readFileSync(path.join(tasksDir, 'task-1.md'), 'utf-8')).toContain(
      'title: Draft survives settings and more'
    );

    await page.getByRole('button', { name: 'Back to Tasks' }).click();
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveValue('Draft survives settings and more');

    // The task's own back arrow still leads to the board
    await page.getByRole('button', { name: 'Back to Tasks' }).click();
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveCount(0);
  });

  test('opens from the keyboard shortcut and from the routines drawer', async ({ page }) => {
    await page.keyboard.press(isMac ? 'Meta+Shift+R' : 'Control+Shift+R');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Manage Routines' }).click();

    await expect(page.getByTestId('settings-view')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: 'Routines' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
