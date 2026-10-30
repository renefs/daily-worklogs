import React from 'react';
import { SegmentedControl } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export type ColorSchemeMode = 'light' | 'dark' | 'auto';

export interface ColorSchemeControlProps {
  value: ColorSchemeMode;
  onChange: (mode: ColorSchemeMode) => void;
}

function isColorSchemeMode(value: string): value is ColorSchemeMode {
  return value === 'light' || value === 'dark' || value === 'auto';
}

export const ColorSchemeControl: React.FC<ColorSchemeControlProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      value={value}
      onChange={(next) => {
        if (isColorSchemeMode(next)) onChange(next);
      }}
      aria-label={t('settings.colorScheme')}
      data={[
        { value: 'light', label: t('settings.light') },
        { value: 'dark', label: t('settings.dark') },
        { value: 'auto', label: t('settings.auto') },
      ]}
      size="sm"
    />
  );
};
