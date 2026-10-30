import React from 'react';
import { CheckIcon, ColorSwatch, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import classes from './ColorSwatchPicker.module.css';

export interface ColorSwatchPickerProps {
  colors: readonly string[];
  value: string | undefined;
  onChange: (color: string) => void;
  /** Accessible name of the whole group, for example "Accent color". */
  label: string;
  size?: number;
  /** Maps a color name to the CSS color shown in the swatch. */
  swatchColor?: (color: string) => string;
}

const defaultSwatchColor = (color: string): string => `var(--mantine-color-${color}-6)`;

/** Keyboard-reachable color choices: every swatch is a labelled toggle button. */
export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  colors,
  value,
  onChange,
  label,
  size = 28,
  swatchColor = defaultSwatchColor,
}) => {
  const { t } = useTranslation();

  return (
    <Group gap="xs" role="group" aria-label={label}>
      {colors.map((color) => {
        const isSelected = value === color;
        const name = t(`settings.colorNames.${color}`, { defaultValue: color });
        return (
          <ColorSwatch
            key={color}
            component="button"
            type="button"
            color={swatchColor(color)}
            size={size}
            radius="md"
            className={classes.swatch}
            aria-label={name}
            aria-pressed={isSelected}
            title={name}
            onClick={() => onChange(color)}
          >
            {isSelected && <CheckIcon width={Math.round(size * 0.44)} />}
          </ColorSwatch>
        );
      })}
    </Group>
  );
};
