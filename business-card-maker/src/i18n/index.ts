import en, { type Dictionary } from './en';
import ar from './ar';
import ckb from './ckb';

export type LanguageCode = 'ckb' | 'ar' | 'en';

export const DICTIONARIES: Record<LanguageCode, Dictionary> = { ckb, ar, en };

export const RTL_LANGUAGES: LanguageCode[] = ['ckb', 'ar'];

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  englishLabel: string;
  rtl: boolean;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'ckb', label: 'کوردی (سۆرانی)', englishLabel: 'Kurdish', rtl: true },
  { code: 'ar', label: 'العربية', englishLabel: 'Arabic', rtl: true },
  { code: 'en', label: 'English', englishLabel: 'English', rtl: false },
];

type Leaves<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${K}.${Leaves<T[K]>}`
    : K;
}[keyof T & string];

export type TKey = Leaves<Dictionary>;

export type TranslateParams = Record<string, string | number>;

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      dictionary,
    );
  return typeof value === 'string' ? value : undefined;
}

/**
 * Resolves `key` in the active language, falling back to English, then to the
 * key itself so a missing string is visible instead of crashing the screen.
 * Placeholders are written as `{{name}}`.
 */
export function translate(
  language: LanguageCode,
  key: string,
  params?: TranslateParams,
): string {
  const template =
    lookup(DICTIONARIES[language], key) ?? lookup(en, key) ?? key;
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function isRTLLanguage(language: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(language);
}

/** Maps a device locale such as `ckb-IQ` or `ar_IQ` onto a supported language. */
export function resolveDeviceLanguage(locales: string[]): LanguageCode {
  for (const raw of locales) {
    const tag = raw.toLowerCase().replace('_', '-');
    if (tag.startsWith('ckb') || tag.startsWith('ku')) return 'ckb';
    if (tag.startsWith('ar')) return 'ar';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

/** Arabic-Indic digits keep numbers consistent with Kurdish/Arabic UI text. */
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function formatNumber(value: number, language: LanguageCode): string {
  const text = String(value);
  if (language === 'en') return text;
  return text.replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

export function formatDate(value: number, language: LanguageCode): string {
  const date = new Date(value);
  const locale =
    language === 'ckb' ? 'ckb-IQ' : language === 'ar' ? 'ar-IQ' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export type { Dictionary };
