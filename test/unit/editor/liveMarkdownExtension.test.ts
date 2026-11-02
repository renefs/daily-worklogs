import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  buildLiveDecorations,
  liveMarkdownExtension,
  LiveMarkdownLabels,
} from '../../../src/components/editor/liveMarkdownExtension';

const labels: LiveMarkdownLabels = {
  copyCode: 'Copy code',
  editTable: 'Edit table',
  imageNotFound: 'Image not found',
  toggleTask: 'Toggle task',
};

function decorationClasses(state: EditorState, from: number, to: number): string[] {
  const decorations = buildLiveDecorations(state, [{ from, to }], labels);
  const classes: string[] = [];
  decorations.between(0, state.doc.length, (_rangeFrom, _rangeTo, decoration) => {
    const className = decoration.spec.class;
    if (typeof className === 'string') classes.push(className);
  });
  return classes;
}

describe('live Markdown decorations', () => {
  it.each([
    ['a Markdown link', '[Example](https://example.com)\nEdit here', 0, 30, 'https://example.com'],
    ['a bare URL', 'Visit https://example.com/docs\nEdit here', 6, 30, 'https://example.com/docs'],
  ])('renders %s as a clickable widget when the caret is elsewhere', (_name, doc, from, to, href) => {
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [markdown({ extensions: GFM })],
    });
    const decorations = buildLiveDecorations(state, undefined, labels);
    const clickableWidgets: HTMLElement[] = [];
    decorations.between(from, to, (rangeFrom, rangeTo, decoration) => {
      if (rangeFrom !== from || rangeTo !== to || !decoration.spec.widget) return;
      clickableWidgets.push(decoration.spec.widget.toDOM({} as never));
    });

    expect(clickableWidgets).toHaveLength(1);
    expect(clickableWidgets[0]).toBeInstanceOf(HTMLAnchorElement);
    expect(clickableWidgets[0].getAttribute('href')).toBe(href);
  });

  it('keeps the middle of a long fenced block styled as code', () => {
    const contentLines = Array.from({ length: 30 }, (_, index) =>
      index === 15 ? '# this is code, not a heading' : `const value${index} = ${index};`
    );
    const state = EditorState.create({
      doc: ['Before', '```ts', ...contentLines, '```', 'After'].join('\n'),
      extensions: [markdown({ extensions: GFM })],
    });
    const middleLine = state.doc.line(18);
    const classes = decorationClasses(state, middleLine.from, middleLine.to);

    expect(classes.some((name) => name.includes('cm-live-codeblock-content'))).toBe(true);
    expect(classes.some((name) => name.includes('cm-live-heading'))).toBe(false);
  });

  it('recognizes a table when only a row in its middle is visible', () => {
    const rows = Array.from({ length: 20 }, (_, index) => `| row ${index} | value ${index} |`);
    const state = EditorState.create({
      doc: ['Before', '| Item | Value |', '| --- | ---: |', ...rows, 'After'].join('\n'),
      extensions: [markdown({ extensions: GFM })],
    });
    const middleRow = state.doc.line(12);
    const decorations = buildLiveDecorations(state, [{ from: middleRow.from, to: middleRow.to }], labels);
    const replacements: Array<{ from: number; to: number; block: boolean }> = [];
    decorations.between(0, state.doc.length, (from, to, decoration) => {
      if (decoration.spec.widget) replacements.push({ from, to, block: decoration.spec.block === true });
    });

    expect(replacements.some((range) => range.block && range.from < middleRow.from && range.to > middleRow.to)).toBe(true);
  });

  it('renders a large pasted Markdown document containing a table without throwing in EditorView', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [markdown({ extensions: GFM }), ...liveMarkdownExtension(labels)],
      }),
      parent,
    });

    const pastedMarkdown = [
      '# Hardening session notes (2026-10-22)',
      '',
      'Notes to continue the work from home.',
      '',
      '## What changed',
      '',
      '- **Client IP** is now `request.remote_addr`, header was `<Wowza IP>, <router IP>`.',
      '- **Replay detection**: `API_REPLAY_PROTECTION` = `off` | `log` (default) | `enforce`.',
      '',
      '## Decisions and why',
      '',
      '| Decision | Reason |',
      '|---|---|',
      '| `authlib<1.7` | 1.9 deprecates `authlib.jose` and raises `joserfc` exceptions. |',
      '| Replay mode defaults to `log` | A client retrying an identical signed URL would be rejected. |',
      '| Version stays 5.2.0 | Fits the `[unreleased]` section becoming 5.2.0. |',
      '',
      '## Useful commands',
      '',
      '```bash',
      'uv run pre-commit run --all-files',
      'uv run pytest --ignore=tests/e2e',
      '```',
    ].join('\n');

    expect(() => {
      view.dispatch({
        changes: { from: 0, to: 0, insert: pastedMarkdown },
        selection: { anchor: pastedMarkdown.length },
      });
    }).not.toThrow();

    expect(parent.querySelector('.cm-live-table')).not.toBeNull();
    expect(parent.textContent).toContain('Hardening session notes (2026-10-22)');
    expect(parent.textContent).toContain('authlib<1.7');
    expect(parent.textContent).toContain('Useful commands');
    expect(parent.textContent).toContain('uv run pytest --ignore=tests/e2e');

    view.destroy();
    parent.remove();
  });

  it('avoids unmeasured vertical margins on block/line elements and zero-height hidden marks in liveEditor.css', () => {
    const cssPath = path.resolve(process.cwd(), 'src/styles/liveEditor.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    const getRuleBody = (selector: string): string => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
      return match ? match[1] : '';
    };

    // Direct children of .cm-content (lines and block widgets) must not have vertical margins,
    // because CodeMirror's heightMap measures getBoundingClientRect().height (which excludes margins).
    expect(getRuleBody('.cm-live-h1')).not.toMatch(/margin-(top|bottom)\s*:/);
    expect(getRuleBody('.cm-live-h2')).not.toMatch(/margin-(top|bottom)\s*:/);
    expect(getRuleBody('.cm-live-table-wrapper')).toMatch(/margin\s*:\s*0\s*;/);
    expect(getRuleBody('.cm-live-codeblock-start')).not.toMatch(/margin-(top|bottom)\s*:/);
    expect(getRuleBody('.cm-live-codeblock-end')).not.toMatch(/margin-(top|bottom)\s*:/);

    // Hidden inline delimiter marks must not collapse height/font-size to 0, which breaks
    // CodeMirror's InlineCoordsScan vertical overlap check when clicking inline code.
    const hiddenMarkBody = getRuleBody('.cm-live-mark-hidden');
    expect(hiddenMarkBody).toMatch(/width\s*:\s*0/);
    expect(hiddenMarkBody).not.toMatch(/height\s*:\s*0/);
    expect(hiddenMarkBody).not.toMatch(/font-size\s*:\s*0/);
  });
});
