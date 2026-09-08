import { autocompletion, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { TagDefinition } from '../../types';
import { parseTagHierarchy } from '../../utils/tagUtils';

/**
 * Creates a CodeMirror extension that autocompletes `#tags` with project/service info
 */
export function createTagAutocompleteExtension(
  getTags: () => TagDefinition[] | string[]
): Extension {
  const tagCompletionSource = (context: CompletionContext): CompletionResult | null => {
    // Match # followed by word characters or / - _ :
    const word = context.matchBefore(/#[\p{L}\p{N}/_:-]*/u);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;
    if (word.from > 0 && /[\p{L}\p{N}_]/u.test(context.state.sliceDoc(word.from - 1, word.from))) return null;

    let syntaxNode = syntaxTree(context.state).resolveInner(context.pos, -1);
    while (syntaxNode) {
      if (['FencedCode', 'CodeText', 'InlineCode', 'URL'].includes(syntaxNode.name)) return null;
      const parent = syntaxNode.parent;
      if (!parent) break;
      syntaxNode = parent;
    }

    const rawTags = getTags();
    const tagDefs: TagDefinition[] = rawTags.map((t) =>
      typeof t === 'string' ? { name: t } : t
    );

    const query = word.text.slice(1).toLowerCase();

    const seen = new Set<string>();
    const options = tagDefs
      .filter((t) => {
        const normalizedName = t.name.trim().toLowerCase();
        if (!normalizedName || seen.has(normalizedName)) return false;
        seen.add(normalizedName);
        if (!query) return true;
        const nameMatch = t.name.toLowerCase().includes(query);
        const serviceMatch = t.service?.toLowerCase().includes(query);
        const projectMatch = t.project?.toLowerCase().includes(query);
        return nameMatch || serviceMatch || projectMatch;
      })
      .map((t) => {
        const { service, project, isHierarchical } = parseTagHierarchy(t.name, tagDefs);
        const detailInfo = isHierarchical || (t.service && t.project)
          ? `${service} • ${project}`
          : t.service
          ? t.service
          : undefined;

        return {
          label: `#${t.name}`,
          displayLabel: `#${t.name}`,
          detail: detailInfo,
          type: 'keyword',
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            const insertText = `${completion.label} `;
            view.dispatch({
              changes: { from, to, insert: insertText },
              selection: { anchor: from + insertText.length },
            });
          },
          boost: t.name.toLowerCase().startsWith(query) ? 2 : 1,
        };
      })
      .sort((a, b) => b.boost - a.boost || a.label.localeCompare(b.label))
      .slice(0, 100);

    return {
      from: word.from,
      options,
      validFor: /^#[\p{L}\p{N}/_:-]*$/u,
    };
  };

  return autocompletion({
    override: [tagCompletionSource],
    defaultKeymap: true,
    icons: true,
  });
}
