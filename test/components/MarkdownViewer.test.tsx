import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithMantine } from '../utils/test-utils';
import { MarkdownViewer } from '../../src/components/viewer/MarkdownViewer';
import { useAppStore } from '../../src/store/useAppStore';

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

  it('opens subtask wikilinks in full task view without opening the modal', () => {
    const openTaskEditorSpy = vi.fn().mockResolvedValue(undefined);
    const openTaskModalSpy = vi.fn().mockResolvedValue(undefined);
    const subtask = {
      id: 'task-2',
      taskId: 2,
      filename: 'task-2.md',
      filepath: '/mock/vault/tasks/task-2.md',
      title: 'Subtask item',
      status: 'todo' as const,
      parent: 1,
    };

    useAppStore.setState({
      tasks: [subtask],
      openTaskEditor: openTaskEditorSpy,
      openTaskModal: openTaskModalSpy,
    });

    renderWithMantine(<MarkdownViewer content="- [ ] [[#2|Subtask item]]" />);

    fireEvent.click(screen.getByText('Subtask item'));

    expect(openTaskEditorSpy).toHaveBeenCalledWith(subtask);
    expect(openTaskModalSpy).not.toHaveBeenCalled();
  });
});
