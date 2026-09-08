import React from 'react';
import { Stack, Title, Text, Card, Select, Paper } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { WeekStartDay } from '../../../types';

export interface StepScheduleProps {
  weekStartDay: WeekStartDay;
  onWeekStartDayChange: (val: WeekStartDay) => void;
}

export const StepSchedule: React.FC<StepScheduleProps> = ({
  weekStartDay,
  onWeekStartDayChange,
}) => {
  const { t } = useTranslation();

  return (
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
            onChange={(val) => onWeekStartDayChange(Number(val) as WeekStartDay)}
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
          <Paper
            p="xs"
            radius="sm"
            withBorder
            style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
          >
            <Text size="xs" c="dimmed">
              {t('onboarding.weekStartHelp')}
            </Text>
          </Paper>
        </Stack>
      </Card>
    </Stack>
  );
};
