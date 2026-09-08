import React from 'react';
import { Stack, Text, UnstyledButton, Progress, Group } from '@mantine/core';
import clsx from 'clsx';
import classes from '../PeriodTasksBreakdown.module.css';

export interface MetricRowItem {
  key: string;
  name: string;
  hint?: string;
  completed: number;
  total: number;
  color: string;
  selected: boolean;
  onToggle: () => void;
}

export interface MetricRowsProps {
  label: string;
  rows: MetricRowItem[];
}

export const MetricRows: React.FC<MetricRowsProps> = ({ label, rows }) => {
  if (rows.length === 0) return null;
  return (
    <Stack gap={2}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      {rows.map((row) => {
        const pct = Math.round((row.completed / (row.total || 1)) * 100);
        return (
          <UnstyledButton
            key={row.key}
            className={clsx(
              classes.brow,
              row.selected && classes.browActive,
              'pbd-brow',
              row.selected && 'active'
            )}
            onClick={row.onToggle}
            aria-pressed={row.selected}
          >
            <Text size="xs" truncate>
              {row.name}
              {row.hint && (
                <Text span size="xs" c="dimmed" inherit>
                  {' · '}
                  {row.hint}
                </Text>
              )}
            </Text>
            <Progress value={pct} size={4} radius="xl" color={pct === 100 ? 'teal' : row.color} />
            <Text size="xs" c="dimmed" ta="right" ff="var(--font-mono)">
              {row.completed}/{row.total}
            </Text>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
};

export interface PillItem {
  key: string;
  label: string;
  color: string;
  selected: boolean;
  onToggle: () => void;
}

export interface PillRowProps {
  label: string;
  emptyLabel?: string;
  pills: PillItem[];
}

export const PillRow: React.FC<PillRowProps> = ({ label, emptyLabel, pills }) => (
  <Stack gap={4} mt="xs">
    <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
      {label}
    </Text>
    {pills.length === 0 ? (
      <Text size="xs" c="dimmed">
        {emptyLabel}
      </Text>
    ) : (
      <Group gap={6} wrap="wrap">
        {pills.map((pill) => (
          <UnstyledButton
            key={pill.key}
            onClick={pill.onToggle}
            aria-pressed={pill.selected}
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              padding: '2px 7px',
              borderRadius: 5,
              border: `1px solid ${
                pill.selected
                  ? `var(--mantine-color-${pill.color}-6)`
                  : 'var(--app-subtle-border)'
              }`,
              backgroundColor: pill.selected
                ? `var(--mantine-color-${pill.color}-light)`
                : 'transparent',
              color: pill.selected
                ? `var(--mantine-color-${pill.color}-filled)`
                : 'var(--app-text-secondary)',
            }}
          >
            {pill.label}
          </UnstyledButton>
        ))}
      </Group>
    )}
  </Stack>
);
