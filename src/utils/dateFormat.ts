import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';

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
export function formatDate(dateStr: string, format?: string, lang?: string): string {
  const targetLang = lang === 'es' ? 'es' : 'en';
  const targetFormat = format && format.trim() ? format.trim() : 'YYYY-MM-DD';

  try {
    const d = dayjs(dateStr).locale(targetLang);
    if (!d.isValid()) return dateStr;
    const formatted = d.format(targetFormat);
    return formatted;
  } catch (err) {
    console.error('Error formatting date:', err);
    return dateStr;
  }
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

