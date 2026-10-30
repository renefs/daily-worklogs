import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatLocalizedDateTitle,
  capitalizeFirstLetter,
} from '../../../src/utils/dateFormat';

describe('dateFormat utils', () => {
  describe('capitalizeFirstLetter', () => {
    it('capitalizes the first letter of string', () => {
      expect(capitalizeFirstLetter('monday')).toBe('Monday');
      expect(capitalizeFirstLetter('agosto')).toBe('Agosto');
      expect(capitalizeFirstLetter('')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date using standard formats', () => {
      expect(formatDate('2026-08-20', 'YYYY-MM-DD')).toBe('2026-08-20');
      expect(formatDate('2026-08-20', 'DD/MM/YYYY')).toBe('20/08/2026');
      expect(formatDate('2026-08-20', 'MMMM D, YYYY', 'en')).toBe('August 20, 2026');
    });

    it('returns raw string if invalid date is provided', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatLocalizedDateTitle', () => {
    it('formats localized titles in English and Spanish', () => {
      expect(formatLocalizedDateTitle('2026-08-20', 'en')).toBe('Thursday, August 20, 2026');
      expect(formatLocalizedDateTitle('2026-08-20', 'es')).toBe('Jueves, 20 de agosto de 2026');
    });
  });
});
