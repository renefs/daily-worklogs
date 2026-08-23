import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';

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

/**
 * Split a markdown table row into cells, taking escaped pipes into account.
 */
function splitTableRow(rowStr: string): string[] {
  let trimmed = rowStr.trim();
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.slice(0, -1);
  }

  const cells: string[] = [];
  let current = '';
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      current += char;
    } else if (char === '|' && !escaped) {
      cells.push(current.trim());
      current = '';
    } else {
      escaped = false;
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse column alignments from a markdown table delimiter row.
 */
function parseDelimiterRow(delimiterStr: string): Array<'left' | 'center' | 'right' | undefined> | null {
  const cells = splitTableRow(delimiterStr);
  if (cells.length === 0) return null;

  const alignments: Array<'left' | 'center' | 'right' | undefined> = [];
  for (const cell of cells) {
    const trimmed = cell.trim();
    const match = trimmed.match(/^(:?)-+(:?)$/);
    if (!match) {
      return null;
    }
    const leftColon = match[1] === ':';
    const rightColon = match[2] === ':';

    if (leftColon && rightColon) {
      alignments.push('center');
    } else if (rightColon) {
      alignments.push('right');
    } else if (leftColon) {
      alignments.push('left');
    } else {
      alignments.push(undefined);
    }
  }

  return alignments;
}

function isDelimiterRow(text: string): boolean {
  return parseDelimiterRow(text) !== null;
}

/**
 * Format inline markdown tokens (bold, italic, strike, code, link, checkboxes) safely into HTML for table cells.
 */
function renderInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Escaped pipe \| -> |
  html = html.replace(/\\\|/g, '|');

  // Checkboxes
  html = html.replace(/\[ \]/g, '<span class="cm-live-table-checkbox"></span>');
  html = html.replace(
    /\[[xX]\]/g,
    '<span class="cm-live-table-checkbox checked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>'
  );

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="cm-live-code">$1</code>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="cm-live-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold + Italic: ***text*** or ___text___
  html = html.replace(/(\*{3}|_{3})(.*?)\1/g, '<strong><em>$2</em></strong>');

  // Bold: **text** or __text__
  html = html.replace(/(\*{2}|_{2})(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  return html;
}

interface TableData {
  headerLine: number;
  delimiterLine: number;
  endLine: number;
  headers: string[];
  rows: string[][];
  alignments: Array<'left' | 'center' | 'right' | undefined>;
}

/**
 * Detect a markdown table starting at line lineNum
 */
function findTableStartingAt(doc: { lines: number; line: (n: number) => { text: string } }, lineNum: number): TableData | null {
  if (lineNum >= doc.lines) return null;
  const headerText = doc.line(lineNum).text;
  if (!headerText.includes('|')) return null;

  const delimiterText = doc.line(lineNum + 1).text;
  if (!delimiterText.includes('|')) return null;

  const alignments = parseDelimiterRow(delimiterText);
  if (!alignments) return null;

  const headers = splitTableRow(headerText);
  if (headers.length === 0) return null;

  const rows: string[][] = [];
  let cur = lineNum + 2;
  while (cur <= doc.lines) {
    const rowText = doc.line(cur).text;
    if (!rowText.includes('|') || rowText.trim() === '') {
      break;
    }
    if (isDelimiterRow(rowText)) {
      break;
    }
    rows.push(splitTableRow(rowText));
    cur++;
  }

  return {
    headerLine: lineNum,
    delimiterLine: lineNum + 1,
    endLine: cur - 1,
    headers,
    rows,
    alignments,
  };
}

/**
 * Interactive Table Widget that renders formatted tables with Mantine design.
 * Clicking focuses the editor on the clicked row/table.
 */
class TableWidget extends WidgetType {
  constructor(
    readonly headers: string[],
    readonly rows: string[][],
    readonly alignments: Array<'left' | 'center' | 'right' | undefined>,
    readonly from: number,
    readonly to: number,
    readonly rawText: string,
    readonly headerLineNum: number
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-table-wrapper';

    const hint = document.createElement('span');
    hint.className = 'cm-live-table-hint';
    hint.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>Click to edit table`;
    wrapper.appendChild(hint);

    const table = document.createElement('table');
    table.className = 'cm-live-table';

    if (this.headers.length > 0) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      this.headers.forEach((h, colIdx) => {
        const th = document.createElement('th');
        const align = this.alignments[colIdx];
        if (align) {
          th.style.textAlign = align;
        }
        th.innerHTML = renderInlineMarkdown(h);
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    if (this.rows.length > 0) {
      const tbody = document.createElement('tbody');
      this.rows.forEach((row) => {
        const tr = document.createElement('tr');
        const colCount = Math.max(this.headers.length, this.alignments.length);
        for (let colIdx = 0; colIdx < colCount; colIdx++) {
          const td = document.createElement('td');
          const align = this.alignments[colIdx];
          if (align) {
            td.style.textAlign = align;
          }
          const cellContent = row[colIdx] || '';
          td.innerHTML = renderInlineMarkdown(cellContent);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    wrapper.appendChild(table);

    wrapper.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      let targetPos = this.from;
      const tr = target.closest('tr');
      if (tr) {
        const tbody = tr.parentElement;
        if (tbody && tbody.tagName === 'TBODY') {
          const rowIndex = Array.from(tbody.children).indexOf(tr);
          if (rowIndex >= 0) {
            const targetLineNum = this.headerLineNum + 2 + rowIndex;
            if (targetLineNum <= view.state.doc.lines) {
              targetPos = view.state.doc.line(targetLineNum).from;
            }
          }
        }
      }

      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
      });
      view.focus();
    });

    return wrapper;
  }

  eq(other: TableWidget): boolean {
    return this.rawText === other.rawText && this.from === other.from && this.to === other.to;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

interface QueuedDeco {
  from: number;
  to: number;
  deco: Decoration;
  isLine?: boolean;
}

/**
 * Build decorations across the document.
 */
function buildLiveDecorations(state: EditorState): DecorationSet {
  const queued: QueuedDeco[] = [];
  const { doc, selection } = state;
  const cursorRanges = selection.ranges;

  // Helper: check if any selection cursor touches or is inside a range
  const isCursorTouching = (start: number, end: number, buffer = 1): boolean => {
    return cursorRanges.some((r) => r.from <= end + buffer && r.to >= start - buffer);
  };

  // Helper: check if any cursor is on a line
  const isCursorOnLine = (lineFrom: number, lineTo: number): boolean => {
    return cursorRanges.some((r) => r.from <= lineTo && r.to >= lineFrom);
  };

  const startLine = 1;
  const endLine = doc.lines;

  let l = startLine;
  while (l <= endLine) {
    const line = doc.line(l);
    const text = line.text;
    const cursorOnCurrentLine = isCursorOnLine(line.from, line.to);

    // 0. Markdown Tables
    const tableData = findTableStartingAt(doc, l);
    if (tableData) {
      const tableFrom = doc.line(tableData.headerLine).from;
      const tableTo = doc.line(tableData.endLine).to;
      const cursorInTable = isCursorTouching(tableFrom, tableTo, 0);

      if (!cursorInTable) {
        const rawTableText = doc.sliceString(tableFrom, tableTo);
        queued.push({
          from: tableFrom,
          to: tableTo,
          deco: Decoration.replace({
            widget: new TableWidget(
              tableData.headers,
              tableData.rows,
              tableData.alignments,
              tableFrom,
              tableTo,
              rawTableText,
              tableData.headerLine
            ),
            block: true,
          }),
        });

        l = tableData.endLine + 1;
        continue;
      } else {
        // Cursor is in table -> style table header line
        queued.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({
            class: 'cm-live-table-line cm-live-table-header-line',
          }),
          isLine: true,
        });
      }
    } else if (text.includes('|') && isDelimiterRow(text)) {
      // Standalone or active delimiter line
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: 'cm-live-table-line cm-live-table-delimiter-line',
        }),
        isLine: true,
      });
    } else if (text.includes('|') && text.trim().startsWith('|')) {
      // Table data line when active
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: 'cm-live-table-line',
        }),
        isLine: true,
      });
    }

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
        l++;
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

    l++;
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
 * CodeMirror 6 Live Markdown StateField
 * StateField is required in CodeMirror 6 to provide block widget decorations (e.g. Tables).
 */
export const liveMarkdownField = StateField.define<DecorationSet>({
  create(state: EditorState) {
    return buildLiveDecorations(state);
  },
  update(decorations: DecorationSet, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLiveDecorations(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Returns the extension suite for Obsidian-like Live Preview markdown editing
 */
export function liveMarkdownExtension() {
  return [
    liveMarkdownField,
    EditorView.editorAttributes.of({ class: 'cm-live-editor' }),
  ];
}
