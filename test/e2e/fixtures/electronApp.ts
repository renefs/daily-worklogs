import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

interface ElectronAppFixture {
  electronApp: ElectronApplication;
  page: Page;
  testVaultDir: string;
  testUserDataDir: string;
  /** Extra settings merged into the seeded settings.json, e.g. to show the setup wizard. */
  settingsOverrides: Record<string, unknown>;
}

export const test = base.extend<ElectronAppFixture>({
  settingsOverrides: [{}, { option: true }],

  testUserDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-e2e-user-data-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },

  testVaultDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-e2e-vault-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },

  electronApp: async ({ testUserDataDir, testVaultDir, settingsOverrides }, use) => {
    // Seed settings.json so Electron boots straight into the test vault without onboarding modal
    const initialSettings = {
      vaultPath: testVaultDir,
      hasCompletedOnboarding: true,
      colorScheme: 'light',
      language: 'en',
      themeColor: 'indigo',
      autoSave: true,
      autoSaveDelay: 500,
      ...settingsOverrides,
    };
    fs.writeFileSync(
      path.join(testUserDataDir, 'settings.json'),
      JSON.stringify(initialSettings, null, 2),
      'utf-8'
    );

    // Clean env to avoid ELECTRON_RUN_AS_NODE breaking the Electron renderer process
    const cleanEnv = { ...process.env };
    delete cleanEnv.ELECTRON_RUN_AS_NODE;

    // Launch Electron application pointing to current repository
    const app = await electron.launch({
      args: ['.', `--user-data-dir=${testUserDataDir}`],
      env: {
        ...cleanEnv,
        NODE_ENV: 'test',
      },
    });

    await use(app);

    // Always terminate the app: on macOS closing windows does not quit the app,
    // and the window close handler is intercepted to flush the editor first.
    const child = app.process();
    const exited = new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else child.once('exit', () => resolve());
    });
    await app.evaluate(({ app: electronApp }) => electronApp.exit(0)).catch(() => undefined);
    const timedOut = await Promise.race([
      exited.then(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 5000)),
    ]);
    if (timedOut) {
      child.kill('SIGKILL');
      await exited;
    }
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
});

export { expect } from '@playwright/test';

