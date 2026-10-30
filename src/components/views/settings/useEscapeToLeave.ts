import { useEffect } from 'react';
import { shouldIgnoreEscape } from '../../../utils/escapeGuard';

/**
 * Calls `onLeave` when Escape is pressed and nothing else wants the key.
 *
 * The decision is split in two phases: the capture phase looks at the page before any
 * component reacted to the key (open dialog, select list, text field), and the bubble
 * phase only acts if nobody called preventDefault in the meantime.
 */
export function useEscapeToLeave(onLeave: () => void): void {
  useEffect(() => {
    let ignored = false;

    const handleCapture = (event: KeyboardEvent) => {
      ignored = shouldIgnoreEscape(event);
    };
    const handleBubble = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const wasIgnored = ignored;
      ignored = false;
      if (wasIgnored || event.defaultPrevented) return;
      onLeave();
    };

    window.addEventListener('keydown', handleCapture, true);
    window.addEventListener('keydown', handleBubble);
    return () => {
      window.removeEventListener('keydown', handleCapture, true);
      window.removeEventListener('keydown', handleBubble);
    };
  }, [onLeave]);
}
