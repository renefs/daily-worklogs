import { StateCommand, EditorSelection, Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { deleteMarkupBackward } from '@codemirror/lang-markdown';

/**
 * Checks if the current cursor position is inside a code block.
 */
function isInsideCodeBlock(state: import('@codemirror/state').EditorState, pos: number): boolean {
  let node: { name: string; parent: any } | null = syntaxTree(state).resolveInner(pos, -1);
  while (node) {
    if (['FencedCode', 'CodeBlock', 'CodeText', 'InlineCode'].includes(node.name)) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

/**
 * Handles Enter key for Markdown lists and blockquotes:
 * - Continues bullet, numbered, and task lists on the next line (single newline, never loose/double newline).
 * - Exits the list if Enter is pressed on an empty list item (dedenting if nested, or clearing if root).
 * - Avoids CodeMirror's default behavior that turns lists into loose lists with double newlines.
 */
export const continueOrExitMarkdownList: StateCommand = ({ state, dispatch }) => {
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) {
    return false;
  }

  const pos = state.selection.main.from;
  const line = state.doc.lineAt(pos);
  const text = line.text;
  const col = pos - line.from;

  if (isInsideCodeBlock(state, pos)) {
    return false;
  }

  // 1. Task checklist item (e.g. "- [ ] " or "  - [x] ")
  const taskEmpty = text.match(/^([ \t]*)([-*+]\s+\[[ xX]\]\s*)$/);
  const taskMatch = text.match(/^([ \t]*)([-*+]\s+\[[ xX]\]\s*)(.*)$/);

  if (taskEmpty && col >= taskEmpty[1].length) {
    const indent = taskEmpty[1];
    if (indent.length >= 2) {
      const dedentLen = indent.startsWith('\t') ? 1 : 2;
      const newIndent = indent.slice(dedentLen);
      const marker = taskEmpty[2];
      dispatch(
        state.update({
          changes: { from: line.from, to: line.to, insert: newIndent + marker },
          selection: EditorSelection.cursor(line.from + newIndent.length + marker.length),
          userEvent: 'delete',
        })
      );
      return true;
    }
    dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: EditorSelection.cursor(line.from),
        userEvent: 'delete',
      })
    );
    return true;
  }

  if (taskMatch) {
    const indent = taskMatch[1];
    const marker = taskMatch[2];
    const content = taskMatch[3];
    const markerLen = indent.length + marker.length;

    if (col >= markerLen) {
      if (content.trim() === '') {
        if (indent.length >= 2) {
          const dedentLen = indent.startsWith('\t') ? 1 : 2;
          const newIndent = indent.slice(dedentLen);
          dispatch(
            state.update({
              changes: { from: line.from, to: line.to, insert: newIndent + marker },
              selection: EditorSelection.cursor(line.from + newIndent.length + marker.length),
              userEvent: 'delete',
            })
          );
          return true;
        }
        dispatch(
          state.update({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: EditorSelection.cursor(line.from),
            userEvent: 'delete',
          })
        );
        return true;
      }

      const insert = `\n${indent}- [ ] `;
      dispatch(
        state.update({
          changes: { from: pos, to: pos, insert },
          selection: EditorSelection.cursor(pos + insert.length),
          userEvent: 'input',
          scrollIntoView: true,
        })
      );
      return true;
    }
  }

  // 2. Ordered list item (e.g. "1. " or "  2. ")
  const orderedEmpty = text.match(/^([ \t]*)(\d+)(\.\s*)$/);
  const orderedMatch = text.match(/^([ \t]*)(\d+)(\.\s+)(.*)$/);

  if (orderedEmpty && col >= orderedEmpty[1].length) {
    const indent = orderedEmpty[1];
    const num = parseInt(orderedEmpty[2], 10);
    if (indent.length >= 2) {
      const dedentLen = indent.startsWith('\t') ? 1 : 2;
      const newIndent = indent.slice(dedentLen);
      dispatch(
        state.update({
          changes: { from: line.from, to: line.to, insert: `${newIndent}${num}. ` },
          selection: EditorSelection.cursor(line.from + newIndent.length + `${num}. `.length),
          userEvent: 'delete',
        })
      );
      return true;
    }
    dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: EditorSelection.cursor(line.from),
        userEvent: 'delete',
      })
    );
    return true;
  }

  if (orderedMatch) {
    const indent = orderedMatch[1];
    const num = parseInt(orderedMatch[2], 10);
    const dotSpace = orderedMatch[3];
    const content = orderedMatch[4];
    const markerLen = indent.length + orderedMatch[2].length + dotSpace.length;

    if (col >= markerLen) {
      if (content.trim() === '') {
        if (indent.length >= 2) {
          const dedentLen = indent.startsWith('\t') ? 1 : 2;
          const newIndent = indent.slice(dedentLen);
          dispatch(
            state.update({
              changes: { from: line.from, to: line.to, insert: `${newIndent}${num}. ` },
              selection: EditorSelection.cursor(line.from + newIndent.length + `${num}. `.length),
              userEvent: 'delete',
            })
          );
          return true;
        }
        dispatch(
          state.update({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: EditorSelection.cursor(line.from),
            userEvent: 'delete',
          })
        );
        return true;
      }

      const nextNum = num + 1;
      const insert = `\n${indent}${nextNum}. `;
      dispatch(
        state.update({
          changes: { from: pos, to: pos, insert },
          selection: EditorSelection.cursor(pos + insert.length),
          userEvent: 'input',
          scrollIntoView: true,
        })
      );
      return true;
    }
  }

  // 3. Bullet list item (e.g. "- ", "* ", "+ ")
  const bulletEmpty = text.match(/^([ \t]*)([-*+]\s*)$/);
  const bulletMatch = text.match(/^([ \t]*)([-*+]\s+)(.*)$/);

  if (bulletEmpty && col >= bulletEmpty[1].length) {
    const indent = bulletEmpty[1];
    if (indent.length >= 2) {
      const dedentLen = indent.startsWith('\t') ? 1 : 2;
      const newIndent = indent.slice(dedentLen);
      const bulletChar = bulletEmpty[2].trimEnd() + ' ';
      dispatch(
        state.update({
          changes: { from: line.from, to: line.to, insert: newIndent + bulletChar },
          selection: EditorSelection.cursor(line.from + newIndent.length + bulletChar.length),
          userEvent: 'delete',
        })
      );
      return true;
    }
    dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: EditorSelection.cursor(line.from),
        userEvent: 'delete',
      })
    );
    return true;
  }

  if (bulletMatch) {
    const indent = bulletMatch[1];
    const bullet = bulletMatch[2];
    const content = bulletMatch[3];
    const markerLen = indent.length + bullet.length;

    if (col >= markerLen) {
      if (content.trim() === '') {
        if (indent.length >= 2) {
          const dedentLen = indent.startsWith('\t') ? 1 : 2;
          const newIndent = indent.slice(dedentLen);
          dispatch(
            state.update({
              changes: { from: line.from, to: line.to, insert: newIndent + bullet },
              selection: EditorSelection.cursor(line.from + newIndent.length + bullet.length),
              userEvent: 'delete',
            })
          );
          return true;
        }
        dispatch(
          state.update({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: EditorSelection.cursor(line.from),
            userEvent: 'delete',
          })
        );
        return true;
      }

      const insert = `\n${indent}${bullet}`;
      dispatch(
        state.update({
          changes: { from: pos, to: pos, insert },
          selection: EditorSelection.cursor(pos + insert.length),
          userEvent: 'input',
          scrollIntoView: true,
        })
      );
      return true;
    }
  }

  // 4. Blockquote (e.g. "> ")
  const quoteEmpty = text.match(/^([ \t]*)(>\s*)$/);
  const quoteMatch = text.match(/^([ \t]*)(>\s*)(.*)$/);

  if (quoteEmpty && col >= quoteEmpty[1].length) {
    dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: EditorSelection.cursor(line.from),
        userEvent: 'delete',
      })
    );
    return true;
  }

  if (quoteMatch) {
    const indent = quoteMatch[1];
    const content = quoteMatch[3];

    if (col >= indent.length + quoteMatch[2].length) {
      if (content.trim() === '') {
        dispatch(
          state.update({
            changes: { from: line.from, to: line.to, insert: '' },
            selection: EditorSelection.cursor(line.from),
            userEvent: 'delete',
          })
        );
        return true;
      }

      const insert = `\n${indent}> `;
      dispatch(
        state.update({
          changes: { from: pos, to: pos, insert },
          selection: EditorSelection.cursor(pos + insert.length),
          userEvent: 'input',
          scrollIntoView: true,
        })
      );
      return true;
    }
  }

  return false;
};

/**
 * Backspace handler for Markdown lists:
 * If the cursor is immediately after an empty list marker (e.g. cursor at 2 in "- "),
 * removes the marker entirely (or dedents if nested) instead of leaving blank spaces.
 */
export const deleteListMarkerBackward: StateCommand = ({ state, dispatch }) => {
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) {
    return false;
  }

  const pos = state.selection.main.from;
  const line = state.doc.lineAt(pos);
  const text = line.text;
  const col = pos - line.from;

  if (isInsideCodeBlock(state, pos)) {
    return false;
  }

  const taskMatch = text.match(/^([ \t]*)([-*+]\s+\[[ xX]\]\s*)(.*)$/);
  const orderedMatch = !taskMatch && text.match(/^([ \t]*)(\d+\.\s+)(.*)$/);
  const bulletMatch = !taskMatch && !orderedMatch && text.match(/^([ \t]*)([-*+]\s+)(.*)$/);
  const quoteMatch = !taskMatch && !orderedMatch && !bulletMatch && text.match(/^([ \t]*)(>\s*)(.*)$/);

  const match = taskMatch || orderedMatch || bulletMatch || quoteMatch;
  if (match) {
    const indent = match[1];
    const marker = match[2];
    const content = match[3];
    const markerLen = indent.length + marker.length;

    if (col === markerLen && content === '') {
      if (indent.length >= 2) {
        const dedentLen = indent.startsWith('\t') ? 1 : 2;
        const newIndent = indent.slice(dedentLen);
        dispatch(
          state.update({
            changes: { from: line.from, to: line.to, insert: newIndent + marker },
            selection: EditorSelection.cursor(line.from + newIndent.length + marker.length),
            userEvent: 'delete',
          })
        );
        return true;
      }
      dispatch(
        state.update({
          changes: { from: line.from, to: line.to, insert: '' },
          selection: EditorSelection.cursor(line.from),
          userEvent: 'delete',
        })
      );
      return true;
    }
  }

  return false;
};

/**
 * Tab handler to indent list lines.
 */
export const indentListLine: StateCommand = ({ state, dispatch }) => {
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) {
    return false;
  }
  const pos = state.selection.main.from;
  const line = state.doc.lineAt(pos);
  const text = line.text;

  if (/^[ \t]*([*+-]\s|[*+-]\s+\[[ xX]\]|\d+\.\s|>)/.test(text)) {
    dispatch(
      state.update({
        changes: { from: line.from, to: line.from, insert: '  ' },
        selection: EditorSelection.cursor(pos + 2),
        userEvent: 'input',
      })
    );
    return true;
  }
  return false;
};

/**
 * Shift-Tab handler to dedent list lines.
 */
export const dedentListLine: StateCommand = ({ state, dispatch }) => {
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) {
    return false;
  }
  const pos = state.selection.main.from;
  const line = state.doc.lineAt(pos);
  const text = line.text;

  if (/^[ \t]{2,}([*+-]\s|[*+-]\s+\[[ xX]\]|\d+\.\s|>)/.test(text)) {
    const dedentLen = text.startsWith('\t') ? 1 : 2;
    dispatch(
      state.update({
        changes: { from: line.from, to: line.from + dedentLen, insert: '' },
        selection: EditorSelection.cursor(Math.max(line.from, pos - dedentLen)),
        userEvent: 'delete',
      })
    );
    return true;
  }
  return false;
};

/**
 * CodeMirror extension providing tight list continuation, clean list exit on Enter,
 * and list indent/dedent keybindings.
 */
export function createMarkdownListExtension(): Extension {
  return Prec.high(
    keymap.of([
      { key: 'Enter', run: continueOrExitMarkdownList },
      {
        key: 'Backspace',
        run: (view) => deleteListMarkerBackward(view) || deleteMarkupBackward(view),
      },
      { key: 'Tab', run: indentListLine },
      { key: 'Shift-Tab', run: dedentListLine },
    ])
  );
}
