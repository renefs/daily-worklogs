/**
 * Decides whether an Escape key press belongs to something else than "leave this page":
 * an open dialog, drawer, spotlight, select list or menu, or a text field being edited.
 *
 * Call it from a capture-phase listener. Floating UI closes itself while the event is
 * still dispatching, so by the bubble phase the DOM may already look idle.
 */

const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Mantine keeps closed select lists and popovers mounted but hidden, so an element only
 * counts as open when none of its ancestors is hidden either.
 */
function isVisible(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return false;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

export function hasOpenOverlay(root: Document = document): boolean {
  return Array.from(root.querySelectorAll(OVERLAY_SELECTOR)).some(isVisible);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

export function shouldIgnoreEscape(event: KeyboardEvent): boolean {
  if (event.key !== 'Escape') return true;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.isComposing) return true;
  // Mantine marks the focused control while its dropdown is open so surrounding modals stay put.
  if (event.target instanceof HTMLElement && event.target.getAttribute('data-mantine-stop-propagation') === 'true') {
    return true;
  }
  return isEditableTarget(event.target) || hasOpenOverlay();
}
