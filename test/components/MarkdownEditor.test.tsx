import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from '../../src/components/editor/MarkdownEditor';
import { renderWithMantine } from '../utils/test-utils';

describe('MarkdownEditor', () => {
  it('gives formatting controls accessible names', () => {
    renderWithMantine(
      <div style={{ height: 400 }}>
        <MarkdownEditor content="# Note" onChange={vi.fn()} showStatusAndActions={false} />
      </div>
    );

    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading level 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Task checkbox' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert Image' })).toBeInTheDocument();
  });
});
