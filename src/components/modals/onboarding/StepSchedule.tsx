import React from 'react';
import { Stack, Title, Text, Card, Select, Group, Switch } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { WeekStartDay } from '../../../types';
import classes from './OnboardingStep.module.css';

export interface StepScheduleProps {
  weekStartDay: WeekStartDay;
  onWeekStartDayChange: (val: WeekStartDay) => void;
  enableDailyRoutines: boolean;
  onEnableDailyRoutinesChange: (val: boolean) => void;
}

const WEEK_DAYS = [
  { value: '1', key: 'monday' },
  { value: '2', key: 'tuesday' },
  { value: '3', key: 'wednesday' },
  { value: '4', key: 'thursday' },
  { value: '5', key: 'friday' },
  { value: '6', key: 'saturday' },
  { value: '0', key: 'sunday' },
] as const;

export const StepSchedule: React.FC<StepScheduleProps> = ({
  weekStartDay,
  onWeekStartDayChange,
  enableDailyRoutines,
  onEnableDailyRoutinesChange,
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <div>
        <Title order={3} fw={700} className={classes.title}>
          {t('onboarding.stepScheduleTitle')}
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('onboarding.stepScheduleDescription')}
        </Text>
      </div>

      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {t('settings.weekStart')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('onboarding.weekStartHelp')}
          </Text>
          <Select
            aria-label={t('settings.weekStart')}
            value={String(weekStartDay)}
            onChange={(val) => onWeekStartDayChange(Number(val ?? '1') as WeekStartDay)}
            data={WEEK_DAYS.map(({ value, key }) => ({ value, label: t(`settings.${key}`) }))}
            allowDeselect={false}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm" fw={600}>
              {t('settings.enableDailyRoutines')}
            </Text>
            <Switch
              aria-label={t('settings.enableDailyRoutines')}
              checked={enableDailyRoutines}
              onChange={(e) => onEnableDailyRoutinesChange(e.currentTarget.checked)}
              size="md"
              color="primary"
            />
          </Group>
          <Text size="xs" c="dimmed">
            {t('onboarding.routinesHelp')}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};
