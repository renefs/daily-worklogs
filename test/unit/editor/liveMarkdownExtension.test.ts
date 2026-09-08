import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { buildLiveDecorations, LiveMarkdownLabels } from '../../../src/components/editor/liveMarkdownExtension';

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
});
