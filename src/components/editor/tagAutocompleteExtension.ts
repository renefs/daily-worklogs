import { autocompletion, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { TagDefinition } from '../../types';
import { getTagColor } from '../../utils/tagUtils';
import { completionDisplayConfig, completionTheme, TagCompletion } from './completionTheme';

/**
 * Creates a CodeMirror extension that autocompletes `#tags`
 */
export function createTagCompletionSource(
  getTags: () => TagDefinition[] | string[]
) {
  return (context: CompletionContext): CompletionResult | null => {
    // Do not trigger tag completion inside a wikilink [[...
    if (context.matchBefore(/\[\[[^\]]*/)) return null;

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
        return t.name.toLowerCase().includes(query);
      })
      .map((t): TagCompletion & { boost: number } => {
        return {
          label: `#${t.name}`,
          displayLabel: `#${t.name}`,
          detail: t.description,
          type: 'tag',
          tagColor: getTagColor(t.name, tagDefs),
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

    if (options.length === 0) return null;

    return {
      from: word.from,
      options,
      validFor: /^#[\p{L}\p{N}/_:-]*$/u,
    };
  };
}

export function createTagAutocompleteExtension(
  getTags: () => TagDefinition[] | string[]
): Extension {
  return [
    autocompletion({
      override: [createTagCompletionSource(getTags)],
      defaultKeymap: true,
      ...completionDisplayConfig,
    }),
    completionTheme,
  ];
}

