import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { matchesMarkdownSyntaxNode, sanitizeLivePreviewUrl } from './liveMarkdownUtils';

export interface LiveMarkdownLabels {
  copyCode: string;
  editTable: string;
  imageNotFound: string;
  toggleTask: string;
}

/**
 * Checkbox widget that renders an interactive Mantine-styled checkbox.
 * Clicking toggles the [ ] <-> [x] in the underlying markdown document.
 */
class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
    readonly label: string
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = `cm-live-checkbox-widget ${this.checked ? 'checked' : ''}`;
    wrap.setAttribute('role', 'checkbox');
    wrap.setAttribute('aria-checked', String(this.checked));
    wrap.setAttribute('aria-label', this.label);
    wrap.tabIndex = 0;

    if (this.checked) {
      wrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }

    const toggle = () => {
      const currentDoc = view.state.doc.sliceString(this.pos, this.pos + 3);
      if (!/^\[[ xX]\]$/.test(currentDoc)) return;
      const isCurrentlyChecked = currentDoc.includes('x') || currentDoc.includes('X');
      const newMark = isCurrentlyChecked ? '[ ]' : '[x]';

      view.dispatch({
        changes: {
          from: this.pos,
          to: this.pos + 3,
          insert: newMark,
        },
      });
    };

    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    return wrap;
  }

  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos && this.label === other.label;
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
 * Interactive Code Block Header Widget matching Preview styling
 */
class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly pos: number,
    readonly rawCode: string,
    readonly copyCodeLabel: string
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const header = document.createElement('span');
    header.className = 'cm-live-codeblock-header';
    header.tabIndex = 0;

    const langSpan = document.createElement('span');
    langSpan.className = 'cm-live-codeblock-lang';
    langSpan.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; vertical-align: -2px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    langSpan.append(document.createTextNode(this.lang ? this.lang.toUpperCase() : 'CODE'));
    header.appendChild(langSpan);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'cm-live-codeblock-copy-btn';
    copyBtn.type = 'button';
    copyBtn.title = this.copyCodeLabel;
    copyBtn.setAttribute('aria-label', this.copyCodeLabel);
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void navigator.clipboard.writeText(this.rawCode).then(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#12b886" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }, 2000);
      }).catch(() => {
        copyBtn.classList.add('cm-live-codeblock-copy-error');
      });
    });
    header.appendChild(copyBtn);

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.cm-live-codeblock-copy-btn')) return;
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.pos },
        scrollIntoView: true,
      });
      view.focus();
    });
    header.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.pos }, scrollIntoView: true });
      view.focus();
    });

    return header;
  }

  eq(other: CodeBlockHeaderWidget): boolean {
    return this.lang === other.lang && this.pos === other.pos && this.rawCode === other.rawCode && this.copyCodeLabel === other.copyCodeLabel;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Interactive Code Block Footer Widget matching Preview styling
 */
class CodeBlockFooterWidget extends WidgetType {
  constructor(readonly pos: number) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const footer = document.createElement('span');
    footer.className = 'cm-live-codeblock-footer';

    footer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.pos },
        scrollIntoView: true,
      });
      view.focus();
    });

    return footer;
  }

  eq(other: CodeBlockFooterWidget): boolean {
    return this.pos === other.pos;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Bullet point widget for unordered markdown lists (•, ◦, ▪)
 */
class BulletWidget extends WidgetType {
  constructor(readonly level: number = 0) {
    super();
  }

  toDOM(): HTMLElement {
    const bullet = document.createElement('span');
    const typeClass =
      this.level === 0
        ? 'bullet-disc'
        : this.level === 1
        ? 'bullet-circle'
        : 'bullet-square';
    bullet.className = `cm-live-bullet-widget ${typeClass}`;
    bullet.setAttribute('aria-hidden', 'true');
    return bullet;
  }

  eq(other: BulletWidget): boolean {
    return this.level === other.level;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Clickable link shown when the caret is outside the Markdown source.
 * Opening a new window is intercepted by Electron and delegated to the user's
 * default browser.
 */
class LinkWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly href: string
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const anchor = document.createElement('a');
    anchor.className = 'cm-live-link cm-live-link-widget';
    anchor.href = this.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = this.label;
    anchor.addEventListener('mousedown', (event) => event.stopPropagation());
    return anchor;
  }

  eq(other: LinkWidget): boolean {
    return this.label === other.label && this.href === other.href;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Interactive Image Widget in Live Preview
 */
class ImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly src: string,
    readonly pos: number,
    readonly imageNotFoundLabel: string
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-live-image-widget';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', this.alt || this.src);
    wrap.tabIndex = 0;

    const card = document.createElement('span');
    card.className = 'cm-live-image-card';

    // Resolve URL for local / vault media
    let resolvedSrc = this.src;
    if (
      !/^https?:\/\//i.test(this.src) &&
      !this.src.startsWith('data:') &&
      !this.src.startsWith('worklog-media://')
    ) {
      const cleanPath = this.src.replace(/^\.?\/+/, '');
      resolvedSrc = `worklog-media://vault/${cleanPath}`;
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'cm-live-image-wrapper';

    const img = document.createElement('img');
    img.className = 'cm-live-image-img';
    img.src = sanitizeLivePreviewUrl(resolvedSrc, true) || '';
    img.alt = this.alt || 'Image';
    img.loading = 'lazy';

    img.onerror = () => {
      wrapper.replaceChildren();
      const error = document.createElement('span');
      error.className = 'cm-live-image-error';
      const message = document.createElement('span');
      message.textContent = `${this.imageNotFoundLabel}: ${this.src}`;
      error.appendChild(message);
      wrapper.appendChild(error);
    };

    wrapper.appendChild(img);
    card.appendChild(wrapper);

    // Caption / Footer bar
    const caption = document.createElement('span');
    caption.className = 'cm-live-image-caption';

    const captionText = document.createElement('span');
    captionText.className = 'cm-live-image-caption-text';
    captionText.textContent = this.alt || this.src.split('/').pop() || 'Image';
    caption.appendChild(captionText);

    const badge = document.createElement('span');
    badge.className = 'cm-live-image-caption-badge';
    badge.textContent = this.src.split('/').pop() || 'image';
    caption.appendChild(badge);

    card.appendChild(caption);
    wrap.appendChild(card);

    // Clicking focuses the editor on the image position
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.pos },
        scrollIntoView: true,
      });
      view.focus();
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.pos }, scrollIntoView: true });
      view.focus();
    });

    return wrap;
  }

  eq(other: ImageWidget): boolean {
    return this.alt === other.alt && this.src === other.src && this.pos === other.pos && this.imageNotFoundLabel === other.imageNotFoundLabel;
  }

  ignoreEvent(): boolean {
    return false;
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
function appendInlineMarkdown(container: HTMLElement, text: string): void {
  const tokenPattern = /\[[^\]]+\]\([^)]+\)|\[[ xX]\]|`[^`]+`|\*\*\*.+?\*\*\*|___.+?___|\*\*.+?\*\*|__.+?__|~~.+?~~|\*[^*]+\*|_[^_]+_/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(text)) !== null) {
    container.append(document.createTextNode(text.slice(cursor, match.index).replace(/\\\|/g, '|')));
    const token = match[0];
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const safeUrl = sanitizeLivePreviewUrl(linkMatch[2]);
      if (safeUrl) {
        const anchor = document.createElement('a');
        anchor.className = 'cm-live-link';
        anchor.href = safeUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = linkMatch[1];
        container.appendChild(anchor);
      } else {
        container.append(document.createTextNode(token));
      }
    } else if (/^\[[ xX]\]$/.test(token)) {
      const checkbox = document.createElement('span');
      checkbox.className = `cm-live-table-checkbox${/[xX]/.test(token) ? ' checked' : ''}`;
      checkbox.setAttribute('aria-hidden', 'true');
      container.appendChild(checkbox);
    } else {
      const isTriple = token.startsWith('***') || token.startsWith('___');
      const isBold = !isTriple && (token.startsWith('**') || token.startsWith('__'));
      const tag = token.startsWith('`')
        ? 'code'
        : token.startsWith('~~')
        ? 'del'
        : isBold
        ? 'strong'
        : 'em';
      const markerLength = isTriple ? 3 : isBold || token.startsWith('~~') ? 2 : 1;
      const element = document.createElement(tag);
      element.textContent = token.slice(markerLength, -markerLength);
      if (isTriple) {
        const strong = document.createElement('strong');
        strong.appendChild(element);
        container.appendChild(strong);
      } else {
        container.appendChild(element);
      }
    }
    cursor = match.index + token.length;
  }
  container.append(document.createTextNode(text.slice(cursor).replace(/\\\|/g, '|')));
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
  if (headers.length !== alignments.length) return null;

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
    readonly headerLineNum: number,
    readonly editTableLabel: string
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-table-wrapper';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', this.editTableLabel);
    wrapper.tabIndex = 0;

    const hint = document.createElement('span');
    hint.className = 'cm-live-table-hint';
    hint.textContent = this.editTableLabel;
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
        appendInlineMarkdown(th, h);
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
          appendInlineMarkdown(td, cellContent);
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
    wrapper.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.from }, scrollIntoView: true });
      view.focus();
    });

    return wrapper;
  }

  eq(other: TableWidget): boolean {
    return this.rawText === other.rawText && this.from === other.from && this.to === other.to && this.editTableLabel === other.editTableLabel;
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
export function buildLiveDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[] | undefined,
  labels: LiveMarkdownLabels
): DecorationSet {
  const queued: QueuedDeco[] = [];
  const { doc, selection } = state;
  const tree = syntaxTree(state);
  const cursorRanges = selection.ranges;
  const matchesSyntaxNode = (names: readonly string[], from: number, to: number): boolean =>
    matchesMarkdownSyntaxNode(state, names, from, to);

  // Helper: check if any selection cursor touches or is inside a range
  const isCursorTouching = (start: number, end: number, buffer = 1): boolean => {
    return cursorRanges.some((r) => r.from <= end + buffer && r.to >= start - buffer);
  };

  // Helper: check if any cursor is on a line
  const isCursorOnLine = (lineFrom: number, lineTo: number): boolean => {
    return cursorRanges.some((r) => r.from <= lineTo && r.to >= lineFrom);
  };

  const firstVisibleFrom = visibleRanges?.[0]?.from ?? 0;
  const lastVisibleTo = visibleRanges?.[visibleRanges.length - 1]?.to ?? doc.length;
  // Include surrounding lines so tables and block markers entering the viewport
  // are ready before CodeMirror paints them.
  const startLine = Math.max(1, doc.lineAt(firstVisibleFrom).number - 2);
  const endLine = Math.min(doc.lines, doc.lineAt(lastVisibleTo).number + 2);

  let l = startLine;
  while (l <= endLine) {
    const line = doc.line(l);
    const text = line.text;
    const cursorOnCurrentLine = isCursorOnLine(line.from, line.to);

    // 0. Fenced code blocks. Resolve the enclosing syntax node rather than
    // searching only the viewport, so long blocks remain stable while scrolling.
    let syntaxNode = tree.resolveInner(Math.min(line.from + 1, line.to), 1);
    let fencedRange: { from: number; to: number } | null = null;
    while (syntaxNode) {
      if (syntaxNode.name === 'FencedCode') {
        fencedRange = { from: syntaxNode.from, to: syntaxNode.to };
        break;
      }
      const parent = syntaxNode.parent;
      if (!parent) break;
      syntaxNode = parent;
    }

    if (fencedRange) {
      const blockStartLine = doc.lineAt(fencedRange.from).number;
      const blockEndLine = doc.lineAt(Math.max(fencedRange.from, fencedRange.to - 1)).number;
      const openingLine = doc.line(blockStartLine);
      const openingMatch = openingLine.text.match(/^([ \t]*)(```+|~~~+)(.*)$/);
      const lang = (openingMatch?.[3] || '').trim();
      const langClass = lang ? ` cm-live-codeblock-lang-${lang.toLowerCase()}` : '';
      const closingLine = blockEndLine > blockStartLine ? doc.line(blockEndLine) : null;
      const hasClosingFence = Boolean(closingLine?.text.match(/^[ \t]*(?:```+|~~~+)\s*$/));
      const cursorOnOpening = isCursorOnLine(openingLine.from, openingLine.to);

      const contentEndLine = hasClosingFence ? blockEndLine - 1 : blockEndLine;
      let rawCode = '';
      if (blockStartLine + 1 <= contentEndLine) {
        rawCode = doc.sliceString(doc.line(blockStartLine + 1).from, doc.line(contentEndLine).to);
      }

      if (blockStartLine >= startLine && blockStartLine <= endLine) {
        queued.push({
          from: openingLine.from,
          to: openingLine.from,
          deco: Decoration.line({
            class: `cm-live-codeblock-line cm-live-codeblock-start${cursorOnOpening ? ' cm-live-codeblock-active' : ''}${langClass}`,
          }),
          isLine: true,
        });
        if (!cursorOnOpening) {
          queued.push({
            from: openingLine.from,
            to: openingLine.to,
            deco: Decoration.replace({
              widget: new CodeBlockHeaderWidget(lang, openingLine.from, rawCode, labels.copyCode),
            }),
          });
        }
      }

      for (
        let innerLineNumber = Math.max(blockStartLine + 1, startLine);
        innerLineNumber <= Math.min(contentEndLine, endLine);
        innerLineNumber++
      ) {
        const innerLine = doc.line(innerLineNumber);
        queued.push({
          from: innerLine.from,
          to: innerLine.from,
          deco: Decoration.line({ class: 'cm-live-codeblock-line cm-live-codeblock-content' }),
          isLine: true,
        });
      }

      if (hasClosingFence && closingLine && blockEndLine >= startLine && blockEndLine <= endLine) {
        const cursorOnClosing = isCursorOnLine(closingLine.from, closingLine.to);
        queued.push({
          from: closingLine.from,
          to: closingLine.from,
          deco: Decoration.line({
            class: `cm-live-codeblock-line cm-live-codeblock-end${cursorOnClosing ? ' cm-live-codeblock-active' : ''}`,
          }),
          isLine: true,
        });
        if (!cursorOnClosing) {
          queued.push({
            from: closingLine.from,
            to: closingLine.to,
            deco: Decoration.replace({ widget: new CodeBlockFooterWidget(closingLine.from) }),
          });
        }
      }

      l = Math.min(blockEndLine, endLine) + 1;
      continue;
    }

    // 0. Markdown Tables
    let tableSyntaxNode = tree.resolveInner(Math.min(line.from + 1, line.to), 1);
    let tableRange: { from: number; to: number } | null = null;
    while (tableSyntaxNode) {
      if (tableSyntaxNode.name === 'Table') {
        tableRange = { from: tableSyntaxNode.from, to: tableSyntaxNode.to };
        break;
      }
      const parent = tableSyntaxNode.parent;
      if (!parent) break;
      tableSyntaxNode = parent;
    }
    const tableStartLine = tableRange ? doc.lineAt(tableRange.from).number : l;
    const tableData = findTableStartingAt(doc, tableStartLine);
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
              tableData.headerLine,
              labels.editTable
            ),
            block: true,
          }),
        });

        l = tableData.endLine + 1;
        continue;
      } else {
        const lineClass = l === tableData.headerLine
          ? 'cm-live-table-line cm-live-table-header-line'
          : l === tableData.delimiterLine
            ? 'cm-live-table-line cm-live-table-delimiter-line'
            : 'cm-live-table-line';
        queued.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({
            class: lineClass,
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

    // Initialize occupied ranges for inline decorations on this line
    const occupiedRanges: Array<{ from: number; to: number }> = [];

    // 4. Task List Checkboxes (- [ ] or - [x], * [ ], + [ ])
    const taskMatch = text.match(/^([ \t]*)([-*+]\s+)\[([ xX])\](\s*.*)$/);
    if (taskMatch) {
      const indentLen = taskMatch[1].length;
      const bulletLen = taskMatch[2].length;
      const boxFrom = line.from + indentLen + bulletLen;
      const boxTo = boxFrom + 3; // `[ ]` or `[x]`
      const replaceFrom = line.from + indentLen; // replaces from the `- `
      const replaceTo = boxTo;
      const isChecked = taskMatch[3].toLowerCase() === 'x';
      const cursorTouching = isCursorTouching(replaceFrom, replaceTo, 0);

      // Line style for task list item
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: 'cm-live-list-line cm-live-task-line',
        }),
        isLine: true,
      });

      if (!cursorTouching) {
        queued.push({
          from: replaceFrom,
          to: replaceTo,
          deco: Decoration.replace({
            widget: new CheckboxWidget(isChecked, boxFrom, labels.toggleTask),
          }),
        });
        occupiedRanges.push({ from: replaceFrom, to: replaceTo });

        // If completed task and cursor not on line, style completed text
        if (isChecked && !cursorOnCurrentLine && taskMatch[4] && taskMatch[4].trim()) {
          queued.push({
            from: replaceTo,
            to: line.to,
            deco: Decoration.mark({
              class: 'cm-live-task-completed-text',
            }),
          });
        }
      } else {
        queued.push({
          from: replaceFrom,
          to: replaceTo,
          deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
        });
      }
    }

    // 5. Normal Bullet List Items (- Item, * Item, + Item)
    const bulletMatch = !taskMatch && text.match(/^([ \t]*)([-*+])([ \t]+)(.*)$/);
    if (bulletMatch) {
      const indentLen = bulletMatch[1].length;
      const bulletChar = bulletMatch[2];
      const spaceLen = bulletMatch[3].length;
      const level = Math.min(2, Math.floor(indentLen / 2));
      const markerFrom = line.from + indentLen;
      const markerTo = markerFrom + bulletChar.length + spaceLen;
      const cursorTouchingMarker = isCursorTouching(markerFrom, markerTo, 0);

      // Line style for bullet list item
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: `cm-live-list-line cm-live-bullet-line cm-live-bullet-level-${level}`,
        }),
        isLine: true,
      });

      if (!cursorTouchingMarker) {
        queued.push({
          from: markerFrom,
          to: markerTo,
          deco: Decoration.replace({
            widget: new BulletWidget(level),
          }),
        });
        occupiedRanges.push({ from: markerFrom, to: markerTo });
      } else {
        queued.push({
          from: markerFrom,
          to: markerTo,
          deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
        });
      }
    }

    // 6. Ordered List Items (1. Item, 2. Item)
    const orderedMatch = !taskMatch && !bulletMatch && text.match(/^([ \t]*)(\d+)(\.)([ \t]+)(.*)$/);
    if (orderedMatch) {
      const indentLen = orderedMatch[1].length;
      const numStr = orderedMatch[2];
      const dotStr = orderedMatch[3];
      const spaceLen = orderedMatch[4].length;
      const markerFrom = line.from + indentLen;
      const markerTo = markerFrom + numStr.length + dotStr.length + spaceLen;

      // Line style for ordered list item
      queued.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: 'cm-live-list-line cm-live-ordered-line',
        }),
        isLine: true,
      });

      queued.push({
        from: markerFrom,
        to: markerTo,
        deco: Decoration.mark({ class: 'cm-live-ordered-marker' }),
      });
      occupiedRanges.push({ from: markerFrom, to: markerTo });
    }

    // 7. Inline formatting (bold, italic, strike, code, links)
    // We scan inline tokens within this line that don't collide
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

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['InlineCode'], mFrom, mTo)) {
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

    // A2. Images: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = imageRegex.exec(text)) !== null) {
      const mFrom = line.from + match.index;
      const mTo = mFrom + match[0].length;
      const altText = match[1];
      const srcUrl = match[2];

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['Image'], mFrom, mTo)) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        const touching = isCursorTouching(mFrom, mTo, 1);

        if (touching) {
          // When cursor is touching/on the image markdown, show raw markdown for editing
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-mark-visible' }),
          });
        } else {
          // When cursor is away, replace with live ImageWidget
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.replace({
              widget: new ImageWidget(altText, srcUrl, mFrom, labels.imageNotFound),
            }),
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
      const safeUrl = sanitizeLivePreviewUrl(match[2]);

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['Link'], mFrom, mTo)) {
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
        } else if (safeUrl) {
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.replace({
              widget: new LinkWidget(match[1], safeUrl),
            }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-link-unsafe' }),
          });
        }
      }
    }

    // B2. GFM autolinks: https://example.com and mailto:user@example.com
    const bareUrlRegex = /(?:https?:\/\/|mailto:)[^\s<>()]+/gi;
    while ((match = bareUrlRegex.exec(text)) !== null) {
      let rawUrl = match[0];
      while (/[.,;:!?]$/.test(rawUrl)) rawUrl = rawUrl.slice(0, -1);
      if (!rawUrl) continue;

      const mFrom = line.from + match.index;
      const mTo = mFrom + rawUrl.length;
      const safeUrl = sanitizeLivePreviewUrl(rawUrl);
      if (
        safeUrl &&
        !isOccupied(mFrom, mTo) &&
        matchesSyntaxNode(['URL'], mFrom, mTo)
      ) {
        occupiedRanges.push({ from: mFrom, to: mTo });
        if (isCursorTouching(mFrom, mTo, 1)) {
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.mark({ class: 'cm-live-link' }),
          });
        } else {
          queued.push({
            from: mFrom,
            to: mTo,
            deco: Decoration.replace({
              widget: new LinkWidget(rawUrl, safeUrl),
            }),
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

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['Emphasis'], mFrom, mTo)) {
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

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['StrongEmphasis'], mFrom, mTo)) {
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

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['Emphasis'], mFrom, mTo)) {
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

      if (!isOccupied(mFrom, mTo) && matchesSyntaxNode(['Strikethrough'], mFrom, mTo)) {
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
 * View-scoped decorations keep live preview work proportional to what the user
 * can see instead of rebuilding every decoration in a long document.
 */
function createLiveMarkdownPlugin(labels: LiveMarkdownLabels) {
  return ViewPlugin.fromClass(
    class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLiveDecorations(view.state, view.visibleRanges, labels);
    }

    update(update: { docChanged: boolean; selectionSet: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLiveDecorations(update.view.state, update.view.visibleRanges, labels);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    }
  );
}

/**
 * Returns the extension suite for Obsidian-like Live Preview markdown editing
 */
export function liveMarkdownExtension(labels: LiveMarkdownLabels) {
  return [
    createLiveMarkdownPlugin(labels),
    EditorView.editorAttributes.of({ class: 'cm-live-editor' }),
  ];
}
