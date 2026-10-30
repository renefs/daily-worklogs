import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Title,
  Stack,
  ThemeIcon,
  Badge,
  useMantineColorScheme,
  Divider,
  Box,
} from '@mantine/core';
import {
  IconBook2,
  IconFolder,
  IconLanguage,
  IconCalendarWeek,
  IconDeviceFloppy,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconArrowLeft,
  IconSettings,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { WeekStartDay } from '../../types';
import { StepWelcome } from './onboarding/StepWelcome';
import { StepVault } from './onboarding/StepVault';
import { StepLanguage } from './onboarding/StepLanguage';
import { StepSchedule } from './onboarding/StepSchedule';
import { StepAppearance } from './onboarding/StepAppearance';
import { StepFinish } from './onboarding/StepFinish';

export const OnboardingWizardModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();

  const {
    settings,
    isOnboardingOpen,
    completeOnboarding,
    openSettings,
    loadSettings,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    isOnboardingOpen: state.isOnboardingOpen,
    completeOnboarding: state.completeOnboarding,
    openSettings: state.openSettings,
    loadSettings: state.loadSettings,
  }));

  const [activeStep, setActiveStep] = useState(0);

  // Local draft state initialized from current store settings
  const [vaultPath, setVaultPath] = useState(settings?.vaultPath || '');
  const [language, setLanguage] = useState<'en' | 'es'>(
    settings?.language || (i18n.language === 'es' ? 'es' : 'en')
  );
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(settings?.weekStartDay ?? 1);
  const [autoSave, setAutoSave] = useState(settings?.autoSave ?? true);
  const [themeColor, setThemeColor] = useState(settings?.themeColor || 'indigo');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(
    settings?.colorScheme || 'auto'
  );

  // Sync draft state when settings change or modal opens
  useEffect(() => {
    if (settings && isOnboardingOpen) {
      setVaultPath(settings.vaultPath || '');
      setLanguage(settings.language || (i18n.language === 'es' ? 'es' : 'en'));
      setWeekStartDay(settings.weekStartDay ?? 1);
      setAutoSave(settings.autoSave ?? true);
      setThemeColor(settings.themeColor || 'indigo');
      setThemeMode(settings.colorScheme || 'auto');
    }
  }, [settings, isOnboardingOpen, i18n.language]);

  const handleSelectDirectory = async () => {
    if (window.electronAPI?.selectVaultDirectory) {
      const selected = await window.electronAPI.selectVaultDirectory();
      if (selected) {
        setVaultPath(selected);
        await loadSettings();
      }
    }
  };

  const handleOpenDirectory = async () => {
    if (window.electronAPI?.openInFileManager) {
      await window.electronAPI.openInFileManager(vaultPath);
    }
  };

  const handleLanguageChange = (newLang: 'en' | 'es') => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleThemeModeChange = (val: 'light' | 'dark' | 'auto') => {
    setThemeMode(val);
    setColorScheme(val);
  };

  const handleFinish = async (andOpenSettings = false) => {
    await completeOnboarding({
      vaultPath,
      language,
      weekStartDay,
      autoSave,
      themeColor,
      colorScheme: themeMode,
    });
    if (andOpenSettings) {
      openSettings('general');
    }
  };

  const nextStep = () => setActiveStep((current) => (current < 5 ? current + 1 : current));
  const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current));

  return (
    <Modal
      opened={isOnboardingOpen}
      onClose={() => handleFinish(false)}
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      size="lg"
      radius="lg"
      padding="xl"
      centered
      overlayProps={{
        backgroundOpacity: 0.65,
        blur: 5,
      }}
      styles={{
        content: {
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--mantine-color-default-border)',
        },
      }}
    >
      <Stack gap="lg">
        {/* Header Title */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon size={34} radius="md" variant="filled" color="primary">
              <IconSparkles size={20} />
            </ThemeIcon>
            <div>
              <Title order={4} style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
                {t('onboarding.title')}
              </Title>
              <Text size="xs" c="dimmed">
                {t('onboarding.subtitle')}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color="primary" size="md" radius="sm">
            {activeStep + 1} / 6
          </Badge>
        </Group>

        {/* Stepper Progress */}
        <Stepper
          active={activeStep}
          onStepClick={setActiveStep}
          size="xs"
          color="primary"
          allowNextStepsSelect={false}
          styles={{
            step: { padding: 0 },
            stepLabel: { fontSize: 11, fontWeight: 600 },
          }}
        >
          <Stepper.Step
            label={t('onboarding.stepWelcome')}
            icon={<IconBook2 size={14} />}
          />
          <Stepper.Step
            label={t('onboarding.stepVault')}
            icon={<IconFolder size={14} />}
          />
          <Stepper.Step
            label={t('onboarding.stepLanguage')}
            icon={<IconLanguage size={14} />}
          />
          <Stepper.Step
            label={t('onboarding.stepSchedule')}
            icon={<IconCalendarWeek size={14} />}
          />
          <Stepper.Step
            label={t('onboarding.stepEditor')}
            icon={<IconDeviceFloppy size={14} />}
          />
          <Stepper.Step
            label={t('onboarding.stepFinish')}
            icon={<IconCheck size={14} />}
          />
        </Stepper>

        <Divider />

        {/* Step Content */}
        <Box style={{ minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {activeStep === 0 && <StepWelcome />}
          {activeStep === 1 && (
            <StepVault
              vaultPath={vaultPath}
              onSelectDirectory={handleSelectDirectory}
              onOpenDirectory={handleOpenDirectory}
            />
          )}
          {activeStep === 2 && (
            <StepLanguage
              language={language}
              onLanguageChange={handleLanguageChange}
            />
          )}
          {activeStep === 3 && (
            <StepSchedule
              weekStartDay={weekStartDay}
              onWeekStartDayChange={setWeekStartDay}
            />
          )}
          {activeStep === 4 && (
            <StepAppearance
              autoSave={autoSave}
              onAutoSaveChange={setAutoSave}
              themeMode={themeMode}
              onThemeModeChange={handleThemeModeChange}
              themeColor={themeColor}
              onThemeColorChange={setThemeColor}
            />
          )}
          {activeStep === 5 && <StepFinish />}
        </Box>

        <Divider />

        {/* Wizard Footer Navigation */}
        <Group justify="space-between" align="center">
          <div>
            {activeStep > 0 ? (
              <Button
                variant="default"
                size="sm"
                leftSection={<IconArrowLeft size={16} />}
                onClick={prevStep}
              >
                {t('onboarding.back')}
              </Button>
            ) : (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => handleFinish(false)}
              >
                {t('onboarding.skip')}
              </Button>
            )}
          </div>

          <Group gap="xs">
            {activeStep < 5 ? (
              <Button
                color="primary"
                size="sm"
                rightSection={<IconArrowRight size={16} />}
                onClick={nextStep}
              >
                {t('onboarding.next')}
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconSettings size={16} />}
                  onClick={() => handleFinish(true)}
                >
                  {t('onboarding.openSettings')}
                </Button>
                <Button
                  color="teal"
                  size="sm"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => handleFinish(false)}
                >
                  {t('onboarding.finish')}
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
