import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';

export const DATE_FORMAT_PRESETS = [
  { value: 'YYYY-MM-DD', labelKey: 'settings.dateFormatPresets.iso', example: '2026-08-20' },
  { value: 'dddd, MMMM D, YYYY', labelKey: 'settings.dateFormatPresets.full', example: 'Thursday, August 20, 2026' },
  { value: 'MMMM D, YYYY', labelKey: 'settings.dateFormatPresets.long', example: 'August 20, 2026' },
  { value: 'ddd, MMM D, YYYY', labelKey: 'settings.dateFormatPresets.medium', example: 'Thu, Aug 20, 2026' },
  { value: 'DD/MM/YYYY', labelKey: 'settings.dateFormatPresets.dayMonthYear', example: '20/08/2026' },
  { value: 'MM/DD/YYYY', labelKey: 'settings.dateFormatPresets.monthDayYear', example: '08/20/2026' },
  { value: 'YYYY/MM/DD', labelKey: 'settings.dateFormatPresets.yearMonthDay', example: '2026/08/20' },
  { value: 'custom', labelKey: 'settings.dateFormatPresets.custom', example: '' },
] as const;

/**
 * Capitalizes the first letter of a string (useful for localized day/month names).
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a given date string with specified format and language.
 */
export function formatTemplateDate(dateStr: string, format?: string, lang?: string): string {
  const targetLang = lang === 'es' ? 'es' : 'en';
  const targetFormat = format && format.trim() ? format.trim() : 'YYYY-MM-DD';

  try {
    const d = dayjs(dateStr).locale(targetLang);
    if (!d.isValid()) return dateStr;
    const formatted = d.format(targetFormat);
    return formatted;
  } catch (err) {
    console.error('Error formatting template date:', err);
    return dateStr;
  }
}

/**
 * Replaces {{date}} and inline {{date:FORMAT}} tokens within template markdown content.
 */
export function formatTemplateContent(
  content: string,
  dateStr: string,
  dateFormat?: string,
  lang?: string
): string {
  if (!content) return '';
  const targetLang = lang === 'es' ? 'es' : 'en';
  const defaultFormat = dateFormat && dateFormat.trim() ? dateFormat.trim() : 'YYYY-MM-DD';

  // 1. First replace custom inline token {{date:FORMAT}}
  let processed = content.replace(/\{\{date:([^}]+)\}\}/g, (_match, customFmt) => {
    return formatTemplateDate(dateStr, customFmt.trim(), targetLang);
  });

  // 2. Replace standard {{date}} token
  processed = processed.replace(/\{\{date\}\}/g, () => {
    return formatTemplateDate(dateStr, defaultFormat, targetLang);
  });

  return processed;
}

/**
 * Formats a localized date title (e.g., Daily view header, Calendar view header).
 * English: "Thursday, August 20, 2026"
 * Spanish: "Jueves, 20 de agosto de 2026"
 */
export function formatLocalizedDateTitle(dateStr: string, lang?: string): string {
  const targetLang = lang === 'es' ? 'es' : 'en';
  try {
    const d = dayjs(dateStr).locale(targetLang);
    if (!d.isValid()) return dateStr;
    const formatPattern = targetLang === 'es' ? 'dddd, D [de] MMMM [de] YYYY' : 'dddd, MMMM D, YYYY';
    const formatted = d.format(formatPattern);
    return capitalizeFirstLetter(formatted);
  } catch {
    return dateStr;
  }
}

