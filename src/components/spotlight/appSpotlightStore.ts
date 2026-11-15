import { createSpotlight } from '@mantine/spotlight';

/**
 * Dedicated Spotlight store for the app's command palette. Owning the store lets the palette
 * re-select its first action when async search results replace the rendered list.
 */
export const [appSpotlightStore, appSpotlight] = createSpotlight();

/** Marks the first rendered action as selected and scrolls the list back to the top. */
export function selectFirstSpotlightAction(): void {
  const { listId } = appSpotlightStore.getState();
  const list = listId ? document.getElementById(listId) : null;
  if (!list) return;

  list.querySelectorAll('[data-selected]').forEach((element) => element.removeAttribute('data-selected'));
  const first = list.querySelector('[data-action]');
  first?.setAttribute('data-selected', 'true');
  list.querySelector('[data-offset-scrollbars]')?.scrollTo({ top: 0 });
  appSpotlightStore.updateState((state) => ({ ...state, selected: first ? 0 : -1 }));
}
