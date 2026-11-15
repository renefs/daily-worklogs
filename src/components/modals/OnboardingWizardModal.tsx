import React, { useState } from 'react';
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
  Divider,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBook2,
  IconFolder,
  IconLanguage,
  IconCalendarWeek,
  IconPalette,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconArrowLeft,
  IconSettings,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DEFAULT_THEME_COLOR } from '../../shared/defaultData';
import { AppSettings, WeekStartDay } from '../../types';
import { StepWelcome } from './onboarding/StepWelcome';
import { StepVault } from './onboarding/StepVault';
import { StepLanguage } from './onboarding/StepLanguage';
import { StepSchedule } from './onboarding/StepSchedule';
import { StepAppearance } from './onboarding/StepAppearance';
import { StepFinish } from './onboarding/StepFinish';
import classes from './OnboardingWizardModal.module.css';

type ColorSchemeMode = AppSettings['colorScheme'];

const STEPS = [
  { labelKey: 'onboarding.stepWelcome', Icon: IconBook2 },
  { labelKey: 'onboarding.stepVault', Icon: IconFolder },
  { labelKey: 'onboarding.stepLanguage', Icon: IconLanguage },
  { labelKey: 'onboarding.stepSchedule', Icon: IconCalendarWeek },
  { labelKey: 'onboarding.stepEditor', Icon: IconPalette },
  { labelKey: 'onboarding.stepFinish', Icon: IconCheck },
] as const;

const LAST_STEP = STEPS.length - 1;

/**
 * First-run setup wizard. It is mounted only while open, so the draft below is
 * read from the saved settings once per opening and never overwritten by later
 * store updates (for example the settings reload that follows a vault change).
 */
export const OnboardingWizardModal: React.FC = () => {
  const { t, i18n } = useTranslation();

  const {
    settings,
    isOnboardingOpen,
    completeOnboarding,
    openSettings,
    changeVault,
    setAppearancePreview,
  } = useAppStoreSelector((state) => ({
    settings: state.settings,
    isOnboardingOpen: state.isOnboardingOpen,
    completeOnboarding: state.completeOnboarding,
    openSettings: state.openSettings,
    changeVault: state.changeVault,
    setAppearancePreview: state.setAppearancePreview,
  }));

  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [vaultPath, setVaultPath] = useState(settings?.vaultPath || '');
  const [language, setLanguage] = useState<'en' | 'es'>(
    settings?.language || (i18n.language === 'es' ? 'es' : 'en')
  );
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(settings?.weekStartDay ?? 1);
  const [enableDailyRoutines, setEnableDailyRoutines] = useState(settings?.enableDailyRoutines !== false);
  const [autoSave, setAutoSave] = useState(settings?.autoSave ?? true);
  const [themeColor, setThemeColor] = useState(settings?.themeColor || DEFAULT_THEME_COLOR);
  const [themeMode, setThemeMode] = useState<ColorSchemeMode>(settings?.colorScheme || 'auto');

  const handleSelectDirectory = async () => {
    const selected = await changeVault();
    if (selected) setVaultPath(selected);
  };

  const handleOpenDirectory = async () => {
    if (vaultPath && window.electronAPI?.openInFileManager) {
      await window.electronAPI.openInFileManager(vaultPath);
    }
  };

  const handleLanguageChange = (newLang: 'en' | 'es') => {
    setLanguage(newLang);
    void i18n.changeLanguage(newLang);
  };

  const handleThemeModeChange = (mode: ColorSchemeMode) => {
    setThemeMode(mode);
    setAppearancePreview({ colorScheme: mode, themeColor });
  };

  const handleThemeColorChange = (color: string) => {
    setThemeColor(color);
    setAppearancePreview({ colorScheme: themeMode, themeColor: color });
  };

  const handleFinish = async (andOpenSettings = false) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await completeOnboarding({
        vaultPath,
        language,
        weekStartDay,
        enableDailyRoutines,
        autoSave,
        themeColor,
        colorScheme: themeMode,
      });
    } catch (err: unknown) {
      console.error('Failed to save setup wizard settings:', err);
      notifications.show({
        title: t('onboarding.saveErrorTitle'),
        message: t('onboarding.saveErrorMessage'),
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
      setIsSaving(false);
      return;
    }
    // The wizard unmounts once onboarding completes, so saving state is not reset here.
    if (andOpenSettings) {
      await openSettings('general');
    }
  };

  const nextStep = () => setActiveStep((current) => Math.min(current + 1, LAST_STEP));
  const prevStep = () => setActiveStep((current) => Math.max(current - 1, 0));

  return (
    <Modal
      opened={isOnboardingOpen}
      onClose={() => void handleFinish(false)}
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      size={760}
      radius="lg"
      padding="xl"
      centered
      overlayProps={{ backgroundOpacity: 0.65, blur: 5 }}
      classNames={{ content: classes.content, body: classes.body }}
    >
      <Stack gap="lg" className={classes.layout}>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon size={34} radius="md" variant="filled" color="primary">
              <IconSparkles size={20} />
            </ThemeIcon>
            <div>
              <Title order={4} className={classes.headerTitle}>
                {t('onboarding.title')}
              </Title>
              <Text size="xs" c="dimmed">
                {t('onboarding.subtitle')}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color="primary" size="md" radius="sm">
            {activeStep + 1} / {STEPS.length}
          </Badge>
        </Group>

        <Stepper
          active={activeStep}
          onStepClick={setActiveStep}
          size="xs"
          color="primary"
          allowNextStepsSelect={false}
          classNames={{ step: classes.step, stepLabel: classes.stepLabel }}
        >
          {STEPS.map(({ labelKey, Icon }) => (
            <Stepper.Step key={labelKey} label={t(labelKey)} icon={<Icon size={14} />} />
          ))}
        </Stepper>

        <Divider />

        <Box className={classes.stepBody}>
          {activeStep === 0 && <StepWelcome />}
          {activeStep === 1 && (
            <StepVault
              vaultPath={vaultPath}
              onSelectDirectory={handleSelectDirectory}
              onOpenDirectory={handleOpenDirectory}
            />
          )}
          {activeStep === 2 && (
            <StepLanguage language={language} onLanguageChange={handleLanguageChange} />
          )}
          {activeStep === 3 && (
            <StepSchedule
              weekStartDay={weekStartDay}
              onWeekStartDayChange={setWeekStartDay}
              enableDailyRoutines={enableDailyRoutines}
              onEnableDailyRoutinesChange={setEnableDailyRoutines}
            />
          )}
          {activeStep === 4 && (
            <StepAppearance
              autoSave={autoSave}
              onAutoSaveChange={setAutoSave}
              themeMode={themeMode}
              onThemeModeChange={handleThemeModeChange}
              themeColor={themeColor}
              onThemeColorChange={handleThemeColorChange}
            />
          )}
          {activeStep === LAST_STEP && <StepFinish />}
        </Box>

        <Divider />

        <Group justify="space-between" align="center">
          <div>
            {activeStep > 0 ? (
              <Button
                variant="default"
                size="sm"
                leftSection={<IconArrowLeft size={16} />}
                onClick={prevStep}
                disabled={isSaving}
              >
                {t('onboarding.back')}
              </Button>
            ) : (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => void handleFinish(false)}
                loading={isSaving}
              >
                {t('onboarding.skip')}
              </Button>
            )}
          </div>

          <Group gap="xs">
            {activeStep < LAST_STEP ? (
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
                  onClick={() => void handleFinish(true)}
                  disabled={isSaving}
                >
                  {t('onboarding.openSettings')}
                </Button>
                <Button
                  color="teal"
                  size="sm"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => void handleFinish(false)}
                  loading={isSaving}
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
