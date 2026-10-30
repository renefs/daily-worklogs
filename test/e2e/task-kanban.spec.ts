import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Task Management & Kanban Board', () => {
  test('creates a new task via modal and saves markdown file to disk', async ({ page, testVaultDir }) => {
    // Navigate to Tasks / Kanban view
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tasks', exact: true })).toHaveAttribute('aria-current', 'page');

    // Click "New Task" button
    await page.click('button:has-text("New Task")');

    // Modal should be visible
    const modal = page.locator('.mantine-Modal-content');
    await expect(modal).toBeVisible();

    // Fill Title using Mantine text input
    const titleInput = modal.locator('input.mantine-TextInput-input').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Deploy Kubernetes Cluster');

    // Click Save button
    await modal.locator('button:has-text("Save")').click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify task appears on Kanban board (scoped to #root to avoid toast notification collision)
    await expect(page.locator('#root').getByText('Deploy Kubernetes Cluster')).toBeVisible({ timeout: 10000 });

    // Verify auto-assigned sequential Task ID badge (#1)
    await expect(page.locator('#root').getByText('#1')).toBeVisible();

    // Verify markdown file exists on disk inside vault tasks/
    const tasksDir = path.join(testVaultDir, 'tasks');
    await expect.poll(() => fs.existsSync(tasksDir) && fs.readdirSync(tasksDir).length > 0, {
      message: `Expected task markdown file in ${tasksDir}`,
      timeout: 10000,
    }).toBe(true);

    const taskFiles = fs.readdirSync(tasksDir);
    expect(taskFiles.length).toBe(1);

    const taskContent = fs.readFileSync(path.join(tasksDir, taskFiles[0]), 'utf-8');
    expect(taskContent).toContain('title: Deploy Kubernetes Cluster');
    expect(taskContent).toContain('id: 1');
  });

  test('hides old closed tasks behind "Show older" and finds them via search', async ({ page, testVaultDir }) => {
    const tasksDir = path.join(testVaultDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const writeClosedTask = (id: number, title: string, completedDaysAgo: number) => {
      fs.writeFileSync(
        path.join(tasksDir, `closed-task-${id}.md`),
        `---\ntaskId: ${id}\ntitle: ${title}\nstatus: done\ncreated: ${daysAgo(completedDaysAgo + 1)}\ncompletedDate: ${daysAgo(completedDaysAgo)}\n---\n\nBody\n`,
        'utf-8'
      );
    };
    writeClosedTask(1, 'Recent shipped feature', 2);
    writeClosedTask(2, 'Ancient migration chore', 60);

    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await page.locator('button:has(.tabler-icon-refresh)').click();

    const board = page.locator('#root');
    await expect(board.getByText('Recent shipped feature')).toBeVisible({ timeout: 10000 });
    await expect(board.getByText('Ancient migration chore')).toHaveCount(0);

    // Expand older tasks in place
    await board.getByRole('button', { name: 'Show 1 older' }).click();
    await expect(board.getByText('Ancient migration chore')).toBeVisible();
    await board.getByRole('button', { name: 'Hide older' }).click();
    await expect(board.getByText('Ancient migration chore')).toHaveCount(0);

    // Search reveals old closed tasks and hides the footer
    await board.getByPlaceholder('Search tasks by title, content, or tags...').fill('Ancient');
    await expect(board.getByText('Ancient migration chore')).toBeVisible();
    await expect(board.getByRole('button', { name: /older/ })).toHaveCount(0);
  });
});
