import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';
import dayjs from 'dayjs';

test.describe('Daily Note Editor & Persistence', () => {
  test('renders markdown editor and saves daily note to disk', async ({ page, testVaultDir }) => {
    // Ensure we are on Daily view
    await page.getByRole('button', { name: 'Daily', exact: true }).click();

    // Wait for the CodeMirror editor to mount
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Focus editor and enter test markdown content
    await editor.click();
    const testContent = `\n- [x] Automated E2E verification entry\n- [ ] Follow-up task`;
    await page.keyboard.type(testContent);

    // Trigger keyboard shortcut to save (Meta+S on Mac, Control+S on Windows/Linux)
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');

    // Wait for disk write to complete
    const today = dayjs().format('YYYY-MM-DD');
    const year = dayjs().format('YYYY');
    const expectedFilePath = path.join(testVaultDir, year, `${today}.md`);

    // Poll until file is written to disk
    await expect.poll(() => fs.existsSync(expectedFilePath), {
      message: `Expected daily note file at ${expectedFilePath}`,
      timeout: 10000,
    }).toBe(true);

    const savedContent = fs.readFileSync(expectedFilePath, 'utf-8');
    expect(savedContent).toContain('Automated E2E verification entry');
    expect(savedContent).toContain('Follow-up task');
  });

  test('adds a Notes section with the cursor ready, saves it, and undoes it', async ({ page, testVaultDir }) => {
    await page.getByRole('button', { name: 'Daily', exact: true }).click();
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await editor.click();
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.type('# Day');

    const addButton = page.getByRole('button', { name: 'Add notes section', exact: true });
    await expect(addButton).toHaveAttribute('aria-disabled', 'false');
    await addButton.click();
    await expect(addButton).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.cm-notes-badge')).toHaveText('Not in reports');

    await page.keyboard.type('Private thought');
    await page.keyboard.press(`${modifier}+s`);

    const today = dayjs().format('YYYY-MM-DD');
    const filePath = path.join(testVaultDir, dayjs().format('YYYY'), `${today}.md`);
    await expect
      .poll(() => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''))
      .toBe('# Day\n\n## Notes\nPrivate thought');

    await page.keyboard.press(`${modifier}+z`);
    await page.keyboard.press(`${modifier}+z`);
    await expect(addButton).toHaveAttribute('aria-disabled', 'false');
    await expect(page.locator('.cm-notes-badge')).toHaveCount(0);
  });
});
