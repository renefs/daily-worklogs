import { test, expect } from './fixtures/electronApp';
import path from 'node:path';
import fs from 'node:fs';
import dayjs from 'dayjs';

test.describe('Daily Note Editor & Persistence', () => {
  test('renders markdown editor and saves daily note to disk', async ({ page, testVaultDir }) => {
    // Ensure we are on Daily view
    await page.click('.header-segmented-control label:has-text("Daily")');

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
});

