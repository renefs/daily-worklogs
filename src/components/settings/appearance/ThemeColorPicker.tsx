import React from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_THEME_COLOR } from '../../../shared/defaultData';
import { ColorSwatchPicker } from './ColorSwatchPicker';

export const THEME_COLORS = [
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

export interface ThemeColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
  size?: number;
}

export const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({ value, onChange, size = 32 }) => {
  const { t } = useTranslation();
  return (
    <ColorSwatchPicker
      colors={THEME_COLORS}
      value={value || DEFAULT_THEME_COLOR}
      onChange={onChange}
      label={t('settings.themeColor')}
      size={size}
    />
  );
};
