export { sanitizeLivePreviewUrl } from '../../utils/urlUtils.ts';

export function matchesMarkdownSyntaxNode(
  state: EditorState,
  names: readonly string[],
  from: number,
  to: number
): boolean {
  const tree = syntaxTree(state);
  let node: ReturnType<typeof tree.resolveInner> | null = tree.resolveInner(Math.min(from + 1, to), 1);
  while (node) {
    if (node.from === from && node.to === to && names.includes(node.name)) return true;
    node = node.parent;
  }
  return false;
}
import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
