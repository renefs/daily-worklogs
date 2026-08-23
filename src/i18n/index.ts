import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function getSystemLanguage(): SupportedLanguage {
  try {
    const candidates: string[] = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
    }

    for (const cand of candidates) {
      if (!cand) continue;
      const primary = cand.toLowerCase().split(/[-_]/)[0];
      if ((SUPPORTED_LANGUAGES as readonly string[]).includes(primary)) {
        return primary as SupportedLanguage;
      }
    }
  } catch {
    // fallback
  }
  return 'en';
}

const initialLanguage = getSystemLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

