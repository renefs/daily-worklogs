import React from 'react';
import { Menu, UnstyledButton, Text, ScrollArea } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import clsx from 'clsx';
import classes from '../PeriodTasksBreakdown.module.css';

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
}

export interface PeriodFilterChipProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
  allLabel: string;
  emptyLabel?: string;
  displayValue?: string;
}

export const PeriodFilterChip: React.FC<PeriodFilterChipProps> = ({
  label,
  value,
  onChange,
  options,
  allLabel,
  emptyLabel,
  displayValue,
}) => {
  const isSet = value !== 'all';
  const shown = isSet
    ? displayValue ?? (options.find((o) => o.value === value)?.label || value)
    : null;

  return (
    <Menu position="bottom-start" shadow="sm" radius="md" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className={clsx(classes.chip, isSet && classes.chipActive, 'pbd-chip', isSet && 'active')}
          aria-haspopup="menu"
        >
          <Text span size="xs" c="dimmed" inherit>
            {label}
          </Text>
          {shown && (
            <Text span size="xs" fw={700} className={clsx(classes.chipVal, 'pbd-chip-val')} inherit>
              {shown}
            </Text>
          )}
          <IconChevronDown size={11} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => onChange('all')} fw={value === 'all' ? 700 : 400}>
          <Text size="xs">{allLabel}</Text>
        </Menu.Item>
        {options.length === 0 ? (
          <Menu.Item disabled>
            <Text size="xs" c="dimmed">
              {emptyLabel || allLabel}
            </Text>
          </Menu.Item>
        ) : (
          <>
            <Menu.Divider />
            <ScrollArea.Autosize mah={260} type="auto">
              {options.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  onClick={() => onChange(opt.value)}
                  fw={value === opt.value ? 700 : 400}
                  rightSection={
                    opt.hint ? (
                      <Text size="xs" c="dimmed" ff="var(--font-mono)">
                        {opt.hint}
                      </Text>
                    ) : undefined
                  }
                >
                  <Text size="xs" truncate>
                    {opt.label}
                  </Text>
                </Menu.Item>
              ))}
            </ScrollArea.Autosize>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
