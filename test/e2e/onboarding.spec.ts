import { test, expect } from './fixtures/electronApp';

test.use({ settingsOverrides: { hasCompletedOnboarding: false, colorScheme: 'light', language: 'en' } });

test('setup wizard keeps the chosen language, previews the theme and saves every choice', async ({ page }) => {
  const wizard = page.getByRole('dialog');
  await expect(wizard.getByText('Setup Wizard')).toBeVisible();

  const next = async (label: string, times = 1) => {
    for (let i = 0; i < times; i++) await wizard.getByRole('button', { name: label, exact: true }).click();
  };

  await next('Next');
  await next('Next');
  await wizard.getByRole('textbox', { name: 'Application Language' }).click();
  await page.getByRole('option', { name: 'Español 🇪🇸' }).click();
  await expect(wizard.getByRole('textbox', { name: 'Idioma de la Aplicación' })).toHaveValue('Español 🇪🇸');

  await next('Siguiente');
  await wizard.getByRole('switch', { name: 'Habilitar rutinas diarias' }).dispatchEvent('click');
  await next('Siguiente');

  // The theme changes before anything is saved.
  await wizard.getByText('Oscuro', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark');

  await next('Siguiente');
  await expect(wizard.getByText('¡Todo Está Listo!')).toBeVisible();
  await wizard.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(wizard).toBeHidden();

  const saved = await page.evaluate(() => window.electronAPI.getSettings());
  expect(saved).toMatchObject({
    hasCompletedOnboarding: true,
    language: 'es',
    colorScheme: 'dark',
    enableDailyRoutines: false,
  });

  // Saved choices survive a restart of the renderer.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
