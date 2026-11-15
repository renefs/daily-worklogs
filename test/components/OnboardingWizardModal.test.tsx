import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { notifications } from '@mantine/notifications';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import { OnboardingWizardModal } from '../../src/components/modals/OnboardingWizardModal';
import { useAppStore } from '../../src/store/useAppStore';
import { AppSettings, DEFAULT_KANBAN_COLUMNS } from '../../src/types';
import { renderWithMantine } from '../utils/test-utils';

const baseSettings: AppSettings = {
  vaultPath: '/mock/vault',
  language: 'en',
  themeColor: 'blue',
  colorScheme: 'light',
  weekStartDay: 1,
  kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  autoSave: true,
  autoSaveDelay: 1000,
  editorFontSize: 15,
  enableDailyRoutines: true,
  hasCompletedOnboarding: false,
  areas: [],
  projects: [],
};

const goNext = (times: number) => {
  for (let i = 0; i < times; i++) {
    fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.next') }));
  }
};

describe('OnboardingWizardModal', () => {
  let completeOnboarding: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    completeOnboarding = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({
      isOnboardingOpen: true,
      appearancePreview: null,
      settings: baseSettings,
      completeOnboarding,
    });
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('keeps the chosen language through to the saved settings', async () => {
    renderWithMantine(<OnboardingWizardModal />);
    goNext(2);

    fireEvent.click(screen.getByRole('textbox', { name: 'Application Language' }));
    fireEvent.click(await screen.findByText('Español 🇪🇸'));

    await waitFor(() => expect(i18n.language).toBe('es'));
    expect(screen.getByRole('textbox', { name: i18n.t('onboarding.languageSelect') })).toHaveValue('Español 🇪🇸');

    goNext(3);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.finish') }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(completeOnboarding.mock.calls[0][0]).toMatchObject({ language: 'es' });
  });

  it('previews appearance choices and saves the routines toggle', async () => {
    renderWithMantine(<OnboardingWizardModal />);
    goNext(3);

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Daily Routines' }));
    goNext(1);

    fireEvent.click(screen.getByRole('radio', { name: /dark/i }));
    expect(useAppStore.getState().appearancePreview).toEqual({ colorScheme: 'dark', themeColor: 'blue' });

    goNext(1);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(completeOnboarding.mock.calls[0][0]).toMatchObject({
      colorScheme: 'dark',
      enableDailyRoutines: false,
    });
  });

  it('shows an error and stays open when saving fails', async () => {
    const show = vi.spyOn(notifications, 'show');
    completeOnboarding.mockRejectedValue(new Error('disk full'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithMantine(<OnboardingWizardModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip to App' }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save your setup' }))
    );
    expect(screen.getByRole('button', { name: 'Skip to App' })).toBeEnabled();
    consoleError.mockRestore();
  });
});
