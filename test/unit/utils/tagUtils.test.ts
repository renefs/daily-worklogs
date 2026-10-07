import { describe, it, expect } from 'vitest';
import { getTagColor, getHashColor, formatTagDisplay } from '../../../src/utils/tagUtils';
import type { TagDefinition } from '../../../src/types';

describe('tagUtils', () => {
  describe('getHashColor', () => {
    it('returns a deterministic color for a given tag name', () => {
      const color1 = getHashColor('urgent');
      const color2 = getHashColor('urgent');
      expect(color1).toBe(color2);
      expect(typeof color1).toBe('string');
    });
  });

  describe('getTagColor', () => {
    const definitions: TagDefinition[] = [
      { name: 'frontend', color: 'blue' },
      { name: 'backend', color: 'teal' },
    ];

    it('returns custom defined color when present', () => {
      expect(getTagColor('frontend', definitions)).toBe('blue');
      expect(getTagColor('FRONTEND', definitions)).toBe('blue'); // case-insensitive
    });

    it('falls back to deterministic hash color for undefined tags', () => {
      expect(getTagColor('new-tag', definitions)).toBe(getHashColor('new-tag'));
    });

    it('returns gray for empty or null tags', () => {
      expect(getTagColor('', definitions)).toBe('gray');
    });
  });

  describe('formatTagDisplay', () => {
    it('prefixes tags with hash if missing', () => {
      expect(formatTagDisplay('bug')).toBe('#bug');
      expect(formatTagDisplay('#feature')).toBe('#feature');
      expect(formatTagDisplay('')).toBe('');
    });
  });
});

