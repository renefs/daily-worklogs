import { autocompletion, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
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
    const word = context.matchBefore(/#[a-zA-Z0-9/_:-]*/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    const rawTags = getTags();
    const tagDefs: TagDefinition[] = rawTags.map((t) =>
      typeof t === 'string' ? { name: t } : t
    );

    const query = word.text.slice(1).toLowerCase();

    const options = tagDefs
      .filter((t) => {
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
          apply: (view: EditorView, completion: Completion, _from: number, to: number) => {
            const insertText = `${completion.label} `;
            view.dispatch({
              changes: { from: word.from, to, insert: insertText },
              selection: { anchor: word.from + insertText.length },
            });
          },
          boost: t.name.toLowerCase().startsWith(query) ? 2 : 1,
        };
      });

    return {
      from: word.from,
      options,
      validFor: /^#[a-zA-Z0-9/_:-]*$/,
    };
  };

  return autocompletion({
    override: [tagCompletionSource],
    defaultKeymap: true,
    icons: true,
  });
}
