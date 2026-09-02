import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Title,
  Stack,
  Paper,
  Card,
  ThemeIcon,
  Badge,
  TextInput,
  Select,
  Switch,
  ColorSwatch,
  CheckIcon,
  useMantineColorScheme,
  Divider,
  SimpleGrid,
  Box,
} from '@mantine/core';
import {
  IconBook2,
  IconFolder,
  IconFolderOpen,
  IconLanguage,
  IconCalendarWeek,
  IconDeviceFloppy,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconArrowLeft,
  IconMarkdown,
  IconLayoutKanban,
  IconChartBar,
  IconClock,
  IconTemplate,
  IconSettings,
  IconFileText,
  IconAdjustments,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAppStoreSelector } from '../../store/useAppStore';
import { WeekStartDay } from '../../types';
import { DATE_FORMAT_PRESETS, formatTemplateDate } from '../../utils/dateTemplate';

const THEME_COLORS = [
  'claude',
  'indigo',
  'teal',
  'blue',
  'violet',
  'cyan',
  'green',
  'orange',
  'grape',
  'pink',
];

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
  const [dateFormat, setDateFormat] = useState(settings?.dateFormat || 'YYYY-MM-DD');
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
      setDateFormat(settings.dateFormat || 'YYYY-MM-DD');
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
      dateFormat,
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

  const sampleDate = dayjs().format('YYYY-MM-DD');
  const previewFormattedDate = formatTemplateDate(sampleDate, dateFormat, language);

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
          {/* STEP 0: Welcome & App Overview */}
          {activeStep === 0 && (
            <Stack gap="md">
              <div>
                <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                  {t('onboarding.stepWelcomeTitle')}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {t('onboarding.stepWelcomeDescription')}
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="xs">
                <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                  <ThemeIcon size={32} radius="md" color="blue" variant="light" mb="xs">
                    <IconMarkdown size={18} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {t('onboarding.stepWelcomeFeature1Title')}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {t('onboarding.stepWelcomeFeature1Desc')}
                  </Text>
                </Paper>

                <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                  <ThemeIcon size={32} radius="md" color="indigo" variant="light" mb="xs">
                    <IconFileText size={18} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {t('onboarding.stepWelcomeFeature2Title')}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {t('onboarding.stepWelcomeFeature2Desc')}
                  </Text>
                </Paper>

                <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                  <ThemeIcon size={32} radius="md" color="teal" variant="light" mb="xs">
                    <IconChartBar size={18} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {t('onboarding.stepWelcomeFeature3Title')}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {t('onboarding.stepWelcomeFeature3Desc')}
                  </Text>
                </Paper>
              </SimpleGrid>
            </Stack>
          )}

          {/* STEP 1: Vault Location */}
          {activeStep === 1 && (
            <Stack gap="md">
              <div>
                <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                  {t('onboarding.stepVaultTitle')}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {t('onboarding.stepVaultDescription')}
                </Text>
              </div>

              <Card withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    {t('onboarding.currentVault')}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      value={vaultPath}
                      readOnly
                      style={{ flex: 1 }}
                      leftSection={<IconFolder size={16} />}
                      styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
                    />
                    <Button
                      variant="light"
                      color="primary"
                      leftSection={<IconFolderOpen size={16} />}
                      onClick={handleSelectDirectory}
                    >
                      {t('onboarding.changeVault')}
                    </Button>
                    <Button
                      variant="subtle"
                      color="gray"
                      onClick={handleOpenDirectory}
                    >
                      {t('onboarding.openVault')}
                    </Button>
                  </Group>
                </Stack>
              </Card>

              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <ThemeIcon size={24} radius="xl" color="primary" variant="light" mt={2}>
                    <IconSparkles size={14} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" fw={700}>
                      {t('onboarding.stepVaultWhyTitle')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('onboarding.stepVaultWhyDesc')}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Stack>
          )}

          {/* STEP 2: Language & Date Format */}
          {activeStep === 2 && (
            <Stack gap="md">
              <div>
                <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                  {t('onboarding.stepLanguageTitle')}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {t('onboarding.stepLanguageDescription')}
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {t('onboarding.languageSelect')}
                      </Text>
                      <ThemeIcon size={24} radius="md" variant="light" color="blue">
                        <IconLanguage size={14} />
                      </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t('onboarding.languageHelp')}
                    </Text>
                    <Select
                      value={language}
                      onChange={(val) => handleLanguageChange((val as 'en' | 'es') || 'en')}
                      data={[
                        { value: 'en', label: 'English 🇺🇸' },
                        { value: 'es', label: 'Español 🇪🇸' },
                      ]}
                      allowDeselect={false}
                      mt="xs"
                    />
                  </Stack>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {t('onboarding.dateFormatSelect')}
                      </Text>
                      <ThemeIcon size={24} radius="md" variant="light" color="indigo">
                        <IconCalendarWeek size={14} />
                      </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t('onboarding.dateFormatHelp')}
                    </Text>
                    <Select
                      value={dateFormat}
                      onChange={(val) => setDateFormat(val || 'YYYY-MM-DD')}
                      data={DATE_FORMAT_PRESETS.filter((p) => p.value !== 'custom').map((p) => ({
                        value: p.value,
                        label: `${t(p.labelKey)} (${p.value})`,
                      }))}
                      allowDeselect={false}
                      mt="xs"
                    />
                    <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                      <Text size="xs" c="dimmed">
                        {t('onboarding.dateFormatPreview')}:{' '}
                        <strong style={{ color: 'var(--mantine-color-primary-text)' }}>
                          {previewFormattedDate}
                        </strong>
                      </Text>
                    </Paper>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {/* STEP 3: Week Start Day */}
          {activeStep === 3 && (
            <Stack gap="md">
              <div>
                <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                  {t('onboarding.stepScheduleTitle')}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {t('onboarding.stepScheduleDescription')}
                </Text>
              </div>

              <Card withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    {t('settings.weekStart')}
                  </Text>
                  <Select
                    value={String(weekStartDay)}
                    onChange={(val) => setWeekStartDay(Number(val) as WeekStartDay)}
                    data={[
                      { value: '1', label: `${t('settings.monday')} (${t('onboarding.weekStartMonday')})` },
                      { value: '0', label: `${t('settings.sunday')} (${t('onboarding.weekStartSunday')})` },
                      { value: '6', label: `${t('settings.saturday')} (${t('onboarding.weekStartOther')})` },
                      { value: '2', label: t('settings.tuesday') },
                      { value: '3', label: t('settings.wednesday') },
                      { value: '4', label: t('settings.thursday') },
                      { value: '5', label: t('settings.friday') },
                    ]}
                    allowDeselect={false}
                  />
                  <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                    <Text size="xs" c="dimmed">
                      {t('onboarding.weekStartHelp')}
                    </Text>
                  </Paper>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* STEP 4: Auto-Save & Theme */}
          {activeStep === 4 && (
            <Stack gap="md">
              <div>
                <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                  {t('onboarding.stepEditorTitle')}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {t('onboarding.stepEditorDescription')}
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* Auto Save Card */}
                <Card withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text size="sm" fw={600}>
                        {t('onboarding.autoSaveTitle')}
                      </Text>
                      <Switch
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.currentTarget.checked)}
                        size="md"
                        color="primary"
                      />
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t('onboarding.autoSaveDescription')}
                    </Text>
                  </Stack>
                </Card>

                {/* Appearance Mode */}
                <Card withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      {t('onboarding.colorSchemeTitle')}
                    </Text>
                    <Select
                      value={themeMode}
                      onChange={(val) => handleThemeModeChange((val as 'light' | 'dark' | 'auto') || 'auto')}
                      data={[
                        { value: 'auto', label: t('settings.auto') },
                        { value: 'light', label: t('settings.light') },
                        { value: 'dark', label: t('settings.dark') },
                      ]}
                      allowDeselect={false}
                    />
                  </Stack>
                </Card>
              </SimpleGrid>

              {/* Theme Accent Color */}
              <Card withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      {t('onboarding.themeColorTitle')}
                    </Text>
                    <Badge size="sm" variant="light" color={themeColor}>
                      {themeColor}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('onboarding.themeColorDesc')}
                  </Text>
                  <Group gap={10} mt={4}>
                    {THEME_COLORS.map((col) => (
                      <ColorSwatch
                        key={col}
                        color={`var(--mantine-color-${col}-6)`}
                        size={28}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setThemeColor(col)}
                      >
                        {themeColor === col && <CheckIcon size={12} color="#fff" />}
                      </ColorSwatch>
                    ))}
                  </Group>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* STEP 5: All Set & Discover More Settings */}
          {activeStep === 5 && (
            <Stack gap="md">
              <Group gap="md" align="center">
                <ThemeIcon size={44} radius="xl" color="teal" variant="light">
                  <IconCheck size={26} stroke={2.5} />
                </ThemeIcon>
                <div>
                  <Title order={3} fw={700} style={{ fontFamily: 'var(--font-display)' }}>
                    {t('onboarding.stepFinishTitle')}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {t('onboarding.stepFinishSubtitle')}
                  </Text>
                </div>
              </Group>

              {/* Informative Settings Notice Card */}
              <Card withBorder radius="md" p="md" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon size={24} radius="md" color="primary" variant="filled">
                      <IconSettings size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={700}>
                      {t('onboarding.stepFinishSettingsNoticeTitle')}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('onboarding.stepFinishSettingsNoticeDesc')}
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt={4}>
                    <Group gap={8} wrap="nowrap">
                      <ThemeIcon size={20} radius="xl" color="indigo" variant="light">
                        <IconLayoutKanban size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={500}>
                        {t('onboarding.settingsNoticeKanban')}
                      </Text>
                    </Group>

                    <Group gap={8} wrap="nowrap">
                      <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                        <IconClock size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={500}>
                        {t('onboarding.settingsNoticeRoutines')}
                      </Text>
                    </Group>

                    <Group gap={8} wrap="nowrap">
                      <ThemeIcon size={20} radius="xl" color="blue" variant="light">
                        <IconTemplate size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={500}>
                        {t('onboarding.settingsNoticeTemplates')}
                      </Text>
                    </Group>

                    <Group gap={8} wrap="nowrap">
                      <ThemeIcon size={20} radius="xl" color="grape" variant="light">
                        <IconAdjustments size={12} />
                      </ThemeIcon>
                      <Text size="xs" fw={500}>
                        {t('onboarding.settingsNoticeArchiving')}
                      </Text>
                    </Group>
                  </SimpleGrid>

                  <Text size="xs" c="dimmed" mt={4} fs="italic">
                    {t('onboarding.settingsNoticeRevisit')}
                  </Text>
                </Stack>
              </Card>
            </Stack>
          )}
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
                  {t('onboarding.exploreSettings')}
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  rightSection={<IconCheck size={16} />}
                  onClick={() => handleFinish(false)}
                >
                  {t('onboarding.startUsingApp')}
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
