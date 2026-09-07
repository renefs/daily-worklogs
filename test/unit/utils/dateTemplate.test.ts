import { describe, it, expect } from 'vitest';
import {
  formatTemplateDate,
  formatTemplateContent,
  capitalizeFirstLetter,
} from '../../../src/utils/dateTemplate';

describe('dateTemplate utils', () => {
  describe('capitalizeFirstLetter', () => {
    it('capitalizes the first letter of string', () => {
      expect(capitalizeFirstLetter('monday')).toBe('Monday');
      expect(capitalizeFirstLetter('agosto')).toBe('Agosto');
      expect(capitalizeFirstLetter('')).toBe('');
    });
  });

  describe('formatTemplateDate', () => {
    it('formats ISO date using standard formats', () => {
      expect(formatTemplateDate('2026-08-20', 'YYYY-MM-DD')).toBe('2026-08-20');
      expect(formatTemplateDate('2026-08-20', 'DD/MM/YYYY')).toBe('20/08/2026');
      expect(formatTemplateDate('2026-08-20', 'MMMM D, YYYY', 'en')).toBe('August 20, 2026');
    });

    it('returns raw string if invalid date is provided', () => {
      expect(formatTemplateDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatTemplateContent', () => {
    const template = `# {{date}}
## Date in Spanish: {{date:MMMM D, YYYY}}
## Time: {{time}}
`;

    it('substitutes {{date}} and {{date:FORMAT}} tokens properly', () => {
      const output = formatTemplateContent(template, '2026-08-20', 'YYYY-MM-DD', 'en');
      expect(output).toContain('# 2026-08-20');
      expect(output).toContain('## Date in Spanish: August 20, 2026');
    });

    it('handles localized month and day tokens in Spanish', () => {
      const templateEs = `Hoy es {{date:dddd, D [de] MMMM [de] YYYY}}`;
      const output = formatTemplateContent(templateEs, '2026-08-20', 'YYYY-MM-DD', 'es');
      expect(output.toLowerCase()).toContain('jueves');
      expect(output.toLowerCase()).toContain('agosto');
    });
  });
});

