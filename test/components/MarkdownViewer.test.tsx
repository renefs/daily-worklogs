import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithMantine } from '../utils/test-utils';
import { MarkdownViewer } from '../../src/components/viewer/MarkdownViewer';

describe('MarkdownViewer syntax highlighting', () => {
  it('highlights supported code languages and leaves unsupported languages readable', () => {
    const { container } = renderWithMantine(
      <MarkdownViewer
        content={'```javascript\nconst answer = 42;\n```\n\n```elixir\ndefmodule Example do\nend\n```'}
      />
    );

    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
    expect(container.querySelector('code.language-elixir')?.textContent).toContain('defmodule');
    expect(container.querySelector('code.language-elixir .hljs-keyword')).toBeNull();
  });
});
