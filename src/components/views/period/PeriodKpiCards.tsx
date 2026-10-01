import React from 'react';
import { SimpleGrid, Paper, Group, Text, RingProgress } from '@mantine/core';
import { IconCalendarWeek, IconCalendarMonth, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export const ThemeIconWrapper: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-filled)`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};

export interface PeriodKpiCardsProps {
  daysLoggedContent: React.ReactNode;
  daysLoggedSubtitle?: string;
  daysLoggedDelta?: React.ReactNode;
  tasksCompletedValue: string;
  tasksCompletedSubtitle?: string;
  tasksCompletedDelta?: React.ReactNode;
  completionRatePercent: number;
  completionRateSubtitle?: string;
  completionRateDelta?: React.ReactNode;
  calendarIconType?: 'week' | 'month';
}

export const PeriodKpiCards: React.FC<PeriodKpiCardsProps> = ({
  daysLoggedContent,
  daysLoggedSubtitle,
  daysLoggedDelta,
  tasksCompletedValue,
  tasksCompletedSubtitle,
  tasksCompletedDelta,
  completionRatePercent,
  completionRateSubtitle,
  completionRateDelta,
  calendarIconType = 'week',
}) => {
  const { t } = useTranslation();

  return (
    <SimpleGrid cols={{ base: 1, sm: 3, md: 3 }} spacing="md">
      {/* Card 1: Days logged */}
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderColor: 'var(--app-card-border)',
        }}
      >
        <Group gap="md" align="flex-start" wrap="nowrap">
          <ThemeIconWrapper color="blue">
            {calendarIconType === 'week' ? (
              <IconCalendarWeek size={20} />
            ) : (
              <IconCalendarMonth size={20} />
            )}
          </ThemeIconWrapper>
          <div style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
              {t('dashboard.daysLogged', 'Days logged')}
            </Text>
            {typeof daysLoggedContent === 'string' ? (
              <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
                {daysLoggedContent}
              </Text>
            ) : (
              daysLoggedContent
            )}
            {daysLoggedSubtitle && (
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                {daysLoggedSubtitle}
              </Text>
            )}
            {daysLoggedDelta && <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>{daysLoggedDelta}</Text>}
          </div>
        </Group>
      </Paper>

      {/* Card 2: Tasks completed */}
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderColor: 'var(--app-card-border)',
        }}
      >
        <Group gap="md" align="flex-start" wrap="nowrap">
          <ThemeIconWrapper color="teal">
            <IconCheck size={20} />
          </ThemeIconWrapper>
          <div style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
              {t('dashboard.tasksCompleted', 'Tasks completed')}
            </Text>
            <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
              {tasksCompletedValue}
            </Text>
            {tasksCompletedSubtitle && (
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                {tasksCompletedSubtitle}
              </Text>
            )}
            {tasksCompletedDelta && <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>{tasksCompletedDelta}</Text>}
          </div>
        </Group>
      </Paper>

      {/* Card 3: Completion rate */}
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderColor: 'var(--app-card-border)',
        }}
      >
        <Group gap="md" align="flex-start" wrap="nowrap">
          <RingProgress
            size={48}
            roundCaps
            thickness={4}
            sections={[{ value: completionRatePercent, color: 'primary' }]}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" style={{ fontSize: 12, fontWeight: 500 }}>
              {t('dashboard.completionRate', 'Completion rate')}
            </Text>
            <Text fw={800} size="xl" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 2 }}>
              {completionRatePercent}%
            </Text>
            {completionRateSubtitle && (
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                {completionRateSubtitle}
              </Text>
            )}
            {completionRateDelta && <Text size="xs" c="teal.7" fw={600} mt={6} style={{ fontSize: 11 }}>{completionRateDelta}</Text>}
          </div>
        </Group>
      </Paper>
    </SimpleGrid>
  );
};
