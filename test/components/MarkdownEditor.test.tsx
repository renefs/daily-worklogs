import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from '../../src/components/editor/MarkdownEditor';
import { useAppStore } from '../../src/store/useAppStore';
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

  it('opens subtask wikilinks in full task view without opening the modal', async () => {
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

    renderWithMantine(
      <div style={{ height: 400 }}>
        <MarkdownEditor content="- [ ] [[#2|Subtask item]]" onChange={vi.fn()} showStatusAndActions={false} />
      </div>
    );

    window.dispatchEvent(
      new CustomEvent('wikilink-navigate', {
        detail: { target: '#2' },
      })
    );

    await waitFor(() => {
      expect(openTaskEditorSpy).toHaveBeenCalledWith(subtask);
    });
    expect(openTaskModalSpy).not.toHaveBeenCalled();
  });

  it('renders a large Markdown note with tables and code blocks in live preview without crashing', () => {
    const content = [
      '# Hardening session notes (2026-10-22)',
      '',
      '## Decisions and why',
      '',
      '| Decision | Reason |',
      '|---|---|',
      '| `authlib<1.7` | 1.9 deprecates `authlib.jose` |',
      '| Version stays 5.2.0 | Fits the `[unreleased]` section |',
      '',
      '## Useful commands',
      '',
      '```bash',
      'uv run pre-commit run --all-files',
      '```',
    ].join('\n');

    const { container } = renderWithMantine(
      <div style={{ height: 600 }}>
        <MarkdownEditor content={content} onChange={vi.fn()} showStatusAndActions={false} />
      </div>
    );

    expect(container.querySelector('.cm-editor')).not.toBeNull();
    expect(container.textContent).toContain('Hardening session notes (2026-10-22)');
    expect(container.textContent).toContain('Useful commands');
    expect(container.textContent).toContain('uv run pre-commit run --all-files');
  });
});
