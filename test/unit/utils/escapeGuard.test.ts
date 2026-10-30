import { afterEach, describe, expect, it } from 'vitest';
import { hasOpenOverlay, shouldIgnoreEscape } from '../../../src/utils/escapeGuard';

function escapeOn(target: Element | Document, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('shouldIgnoreEscape', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lets a plain Escape on an idle page through', () => {
    expect(shouldIgnoreEscape(escapeOn(document.body))).toBe(false);
  });

  it('ignores other keys and Escape combined with modifiers', () => {
    expect(shouldIgnoreEscape(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(shouldIgnoreEscape(escapeOn(document.body, { shiftKey: true }))).toBe(true);
    expect(shouldIgnoreEscape(escapeOn(document.body, { metaKey: true }))).toBe(true);
  });

  it('ignores Escape typed in a text field', () => {
    document.body.innerHTML = '<input id="field" />';
    expect(shouldIgnoreEscape(escapeOn(document.getElementById('field')!))).toBe(true);
  });

  it('ignores Escape from a control whose dropdown Mantine reports as open', () => {
    document.body.innerHTML = '<button id="trigger" data-mantine-stop-propagation="true"></button>';
    expect(shouldIgnoreEscape(escapeOn(document.getElementById('trigger')!))).toBe(true);
  });

  it('ignores Escape while a dialog is open', () => {
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(shouldIgnoreEscape(escapeOn(document.body))).toBe(true);
  });
});

describe('hasOpenOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not count a select list that Mantine keeps mounted inside a hidden dropdown', () => {
    document.body.innerHTML = '<div style="display: none"><div role="listbox"></div></div>';
    expect(hasOpenOverlay()).toBe(false);
  });

  it('does not count aria-hidden overlays', () => {
    document.body.innerHTML = '<div role="dialog" aria-hidden="true"></div>';
    expect(hasOpenOverlay()).toBe(false);
  });

  it('counts a visible list, menu or dialog', () => {
    document.body.innerHTML = '<div role="menu"></div>';
    expect(hasOpenOverlay()).toBe(true);
  });
});
