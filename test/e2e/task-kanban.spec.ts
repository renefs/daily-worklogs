import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Task Management & Kanban Board', () => {
  test('creates a new task via modal and saves markdown file to disk', async ({ page, testVaultDir }) => {
    // Navigate to Tasks / Kanban view
    await page.click('.header-tasks-button');
    await expect(page.locator('.header-tasks-button')).toHaveAttribute('data-active', 'true');

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
});
