import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

export function renderWithMantine(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(
    <MantineProvider>
      {ui}
    </MantineProvider>,
    options
  );
}

