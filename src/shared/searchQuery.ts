/** Strips wikilink brackets so `[[Some Note]]` searches for `Some Note`. Shared by main and renderer. */
export function normalizeSearchQuery(rawQuery: string): string {
  return rawQuery
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();
}
