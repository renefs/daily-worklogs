import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  continueOrExitMarkdownList,
  deleteListMarkerBackward,
  indentListLine,
  dedentListLine,
} from '../../../src/components/editor/markdownListContinuation';

function createEditor(doc: string, cursorPos: number) {
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursorPos),
    extensions: [markdown({ extensions: GFM, addKeymap: false })],
  });
}

describe('markdownListContinuation', () => {
  describe('continueOrExitMarkdownList (Enter key)', () => {
    it('continues bullet list on the immediately next line without extra blank line', () => {
      const initialText = '- Webcast has been tested on encoders manager and CERN Live.';
      let state = createEditor(initialText, initialText.length);

      let handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe(
        '- Webcast has been tested on encoders manager and CERN Live.\n- '
      );
      expect(state.selection.main.head).toBe(
        '- Webcast has been tested on encoders manager and CERN Live.\n- '.length
      );

      // User types "dsfdsf"
      const typeText = 'dsfdsf';
      const insertPos = state.selection.main.head;
      state = state.update({
        changes: { from: insertPos, insert: typeText },
        selection: EditorSelection.cursor(insertPos + typeText.length),
      }).state;

      // User presses Enter after "dsfdsf"
      handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe(
        '- Webcast has been tested on encoders manager and CERN Live.\n- dsfdsf\n- '
      );

      // Even if list has empty lines elsewhere, Enter never creates a double newline
      expect(state.doc.toString().includes('\n\n- ')).toBe(false);
    });

    it('clears bullet marker and exits the list when pressing Enter on an empty bullet item', () => {
      const text = '- Item 1\n- ';
      let state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1\n');
      expect(state.selection.main.head).toBe('- Item 1\n'.length);
    });

    it('dedents nested bullet item when pressing Enter on an empty nested bullet', () => {
      const text = '- Item 1\n  - Subitem 1\n  - ';
      let state = createEditor(text, text.length);

      let handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1\n  - Subitem 1\n- ');

      // Pressing enter again exits the root list
      handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });
      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1\n  - Subitem 1\n');
    });

    it('continues numbered lists with incremented number and single newline', () => {
      const text = '1. First item';
      let state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('1. First item\n2. ');
    });

    it('clears numbered marker when pressing Enter on an empty numbered item', () => {
      const text = '1. First item\n2. ';
      let state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('1. First item\n');
    });

    it('continues task checklists with fresh unchecked box and single newline', () => {
      const text = '- [x] Completed task';
      let state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- [x] Completed task\n- [ ] ');
    });

    it('clears task marker when pressing Enter on an empty task checkbox', () => {
      const text = '- [ ] Task 1\n- [ ] ';
      let state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- [ ] Task 1\n');
    });

    it('continues blockquotes and exits when empty', () => {
      const text = '> Important quote';
      let state = createEditor(text, text.length);

      let handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('> Important quote\n> ');

      // Enter on empty quote exits
      handled = continueOrExitMarkdownList({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });
      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('> Important quote\n');
    });

    it('does not intercept Enter in normal text', () => {
      const text = 'Just regular paragraph text';
      const state = createEditor(text, text.length);

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: () => {},
      });

      expect(handled).toBe(false);
    });

    it('does not intercept Enter inside a code block', () => {
      const text = '```javascript\n- not a list\n```';
      const state = createEditor(text, 26); // cursor after "- not a list"

      const handled = continueOrExitMarkdownList({
        state,
        dispatch: () => {},
      });

      expect(handled).toBe(false);
    });
  });

  describe('deleteListMarkerBackward (Backspace key)', () => {
    it('deletes empty bullet marker completely on single Backspace', () => {
      const text = '- Item 1\n- ';
      let state = createEditor(text, text.length);

      const handled = deleteListMarkerBackward({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1\n');
    });

    it('dedents empty nested bullet marker on Backspace', () => {
      const text = '- Item 1\n  - ';
      let state = createEditor(text, text.length);

      const handled = deleteListMarkerBackward({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1\n- ');
    });

    it('does not intercept Backspace when item has content', () => {
      const text = '- Item 1';
      const state = createEditor(text, text.length);

      const handled = deleteListMarkerBackward({
        state,
        dispatch: () => {},
      });

      expect(handled).toBe(false);
    });
  });

  describe('Tab and Shift-Tab indent/dedent', () => {
    it('indents list item by 2 spaces on Tab', () => {
      const text = '- Item 1';
      let state = createEditor(text, text.length);

      const handled = indentListLine({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('  - Item 1');
    });

    it('dedents list item by 2 spaces on Shift-Tab', () => {
      const text = '  - Item 1';
      let state = createEditor(text, text.length);

      const handled = dedentListLine({
        state,
        dispatch: (tr) => {
          state = tr.state;
        },
      });

      expect(handled).toBe(true);
      expect(state.doc.toString()).toBe('- Item 1');
    });
  });
});
