import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

/**
 * Checkbox widget that renders an interactive Mantine-styled checkbox.
 * Clicking toggles the [ ] <-> [x] in the underlying markdown document.
 */
class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = `cm-live-checkbox-widget ${this.checked ? 'checked' : ''}`;
    wrap.setAttribute('role', 'checkbox');
    wrap.setAttribute('aria-checked', String(this.checked));

    if (this.checked) {
      wrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }

    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const currentDoc = view.state.doc.sliceString(this.pos, this.pos + 3);
      const isCurrentlyChecked = currentDoc.includes('x') || currentDoc.includes('X');
      const newMark = isCurrentlyChecked ? '[ ]' : '[x]';

      view.dispatch({
        changes: {
          from: this.pos,
          to: this.pos + 3,
          insert: newMark,
        },
      });
    });

    return wrap;
  }

  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Horizontal rule divider widget
 */
class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('div');
    hr.className = 'cm-live-hr-widget';
    return hr;
  }

  eq(): boolean {
    return true;
  }
}

interface QueuedDeco {
  from: number;
  to: number;
  deco: Decoration;
  isLine?: boolean;
}

/**
 * Build decorations across the document / viewport.
 */
function buildLiveDecorations(view: EditorView): DecorationSet {
  const queued: QueuedDeco[] = [];
  const { doc, selection } = view.state;
  const cursorRanges = selection.ranges;

  // Helper: check if any selection cursor touches or is inside a range
  const isCursorTouching = (start: number, end: number, buffer = 1): boolean => {
    return cursorRanges.some((r) => r.from <= end + buffer && r.to >= start - buffer);
  };

  // Helper: check if any cursor is on a line
  const isCursorOnLine = (lineFrom: number, lineTo: number): boolean => {
    return cursorRanges.some((r) => r.from <= lineTo && r.to >= lineFrom);
  };

  // Iterate over visible lines or full document
  const { from: viewFrom, to: viewTo } = view.viewport;
  const startLine = doc.lineAt(viewFrom).number;
  const endLine = doc.lineAt(viewTo).number;

  for (let l = startLine; l <= endLine; l++) {
    const line = doc.line(l);
    const text = line.text;
    const cursorOnCurrentLine = isCursorOnLine(line.from, line.to);

    // 1. Horizontal Rule (---, ***, ___)
    const hrMatch = text.match(/^(---|___|\*\*\*)\s*$/);
    if (hrMatch) {
      if (!cursorOnCurrentLine) {
        queued.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({
            widget: new HorizontalRuleWidget(),
          }),
        });
        continue; // Skip further line processing
      }
    }

    // 2. Headings (# ... ######)
    const headingMatch = text.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const markLength = level + 1; // `# ` or `## `

      // Line style
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: `cm-live-heading cm-live-h${level}`,
        }),
        isLine: true,
      });

      // Delimiter mark
      const markFrom = line.from;
      const markTo = line.from + markLength;

      if (cursorOnCurrentLine) {
        queued.push({
          from: markFrom,
          to: markTo,
          deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
        });
      } else {
        queued.push({
          from: markFrom,
          to: markTo,
          deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
        });
      }
    }

    // 3. Blockquotes (> ...)
    const quoteMatch = text.match(/^(>\s?)(.*)$/);
    if (quoteMatch && !headingMatch) {
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: 'cm-live-blockquote',
        }),
        isLine: true,
      });

      const markLength = quoteMatch[1].length;
      const markFrom = line.from;
      const markTo = line.from + markLength;

      if (cursorOnCurrentLine) {
        queued.push({
          from: markFrom,
          to: markTo,
          deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
        });
      } else {
        queued.push({
          from: markFrom,
          to: markTo,
          deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
        });
      }
    }

    // 4. Task List Checkboxes (- [ ] or - [x])
    const taskMatch = text.match(/^([ \t]*[-*+]\s+)\[([ xX])\](\s+.*)?$/);
    if (taskMatch) {
      const prefixLen = taskMatch[1].length;
      const boxFrom = line.from + prefixLen;
      const boxTo = boxFrom + 3; // `[ ]` or `[x]`
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const cursorTouchingBox = isCursorTouching(boxFrom, boxTo, 0);

      if (!cursorTouchingBox) {
        queued.push({
          from: boxFrom,
          to: boxTo,
          deco: Decoration.replace({
            widget: new CheckboxWidget(isChecked, boxFrom),
          }),
        });

        // If completed task and cursor not on line, style completed text
        if (isChecked && !cursorOnCurrentLine && taskMatch[3]) {
          queued.push({
            from: boxTo,
            to: line.to,
            deco: Decoration.mark({
              class: 'cm-live-task-completed-text',
            }),
          });
        }
      }
    }

    // 5. Inline formatting (bold, italic, strike, code, links)
    // We scan inline tokens within this line that don't collide
    const occupiedRanges: Array<{ from: number; to: number }> = [];
    const isOccupied = (from: number, to: number) => {
      return occupiedRanges.some((r) => Math.max(r.from, from) < Math.min(r.to, to));
    };

    // Regex matchers with capturing groups:
    // A. Inline Code: `code`
    const codeRegex = /`([^`\n]+)`/g;
    let match: RegExpExecArray | null;
    while ((match = codeRegex.exec(text)) !== null) {
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const innerFrom = mFrom + 1;
      const innerTo = mTo - 1;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-code' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-code' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }

    // B. Links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = linkRegex.exec(text)) !== null) {
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const textStart = mFrom + 1;
      const textEnd = textStart + match[1].length;
      const urlPartStart = textEnd;
      const urlPartEnd = mTo;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: textStart,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: textStart,
            to: textEnd,
            deco: Decoration.mark({ class: 'cm-live-link' }),
          });
          queued.push({
            from: urlPartStart,
            to: urlPartEnd,
            deco: Decoration.mark({ class: 'cm-live-mark-visible cm-live-link-url' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: textStart,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: textStart,
            to: textEnd,
            deco: Decoration.mark({ class: 'cm-live-link' }),
          });
          queued.push({
            from: urlPartStart,
            to: urlPartEnd,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }

    // C. Bold + Italic: ***text*** or ___text___
    const boldItalicRegex = /(\*{3}|_{3})(.*?)\1/g;
    while ((match = boldItalicRegex.exec(text)) !== null) {
      if (!match[2]) continue;
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const innerFrom = mFrom + 3;
      const innerTo = mTo - 3;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-bold-italic' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-bold-italic' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }

    // D. Bold: **text** or __text__
    const boldRegex = /(\*{2}|_{2})(.*?)\1/g;
    while ((match = boldRegex.exec(text)) !== null) {
      if (!match[2]) continue;
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const innerFrom = mFrom + 2;
      const innerTo = mTo - 2;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-bold' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-bold' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }

    // E. Italic: *text* or _text_
    const italicRegex = /(\*|_)(.*?)\1/g;
    while ((match = italicRegex.exec(text)) !== null) {
      if (!match[2] || match[0].startsWith('**') || match[0].startsWith('__')) continue;
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const innerFrom = mFrom + 1;
      const innerTo = mTo - 1;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-italic' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-italic' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }

    // F. Strikethrough: ~~text~~
    const strikeRegex = /~~(.*?)~~/g;
    while ((match = strikeRegex.exec(text)) !== null) {
      if (!match[1]) continue;
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const innerFrom = mFrom + 2;
      const innerTo = mTo - 2;

      if (!isOccupied(mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-strike' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: innerFrom,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
          queued.push({
            from: innerFrom,
            to: innerTo,
            deco: Decoration.mark({ class: 'cm-live-strike' }),
          });
          queued.push({
            from: innerTo,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-hidden' }),
          });
        }
      }
    }
  }

  // Sort queued decorations in strictly valid CodeMirror order:
  // 1. Ascending by `from`
  // 2. If same `from`: line decorations first (isLine === true)
  // 3. Ascending by `to`
  queued.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    if (a.isLine && !b.isLine) return -1;
    if (!a.isLine && b.isLine) return 1;
    return a.to - b.to;
  });

  const builder = new RangeSetBuilder<Decoration>();
  for (const item of queued) {
    if (item.from <= item.to) {
      builder.add(item.from, item.to, item.deco);
    }
  }

  return builder.finish();
}

/**
 * CodeMirror 6 Live Markdown Extension plugin
 */
export const liveMarkdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLiveDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLiveDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Returns the extension suite for Obsidian-like Live Preview markdown editing
 */
export function liveMarkdownExtension() {
  return [
    liveMarkdownPlugin,
    EditorView.editorAttributes.of({ class: 'cm-live-editor' }),
  ];
}
