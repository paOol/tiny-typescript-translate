/**
 * The set of languages supported by this library.
 *
 * Codes are ISO 639-1 and intentionally match the language codes used by the
 * underlying m2m100 translation model, so they can be passed straight through.
 */
export const LANGUAGES = ['en', 'es', 'zh', 'ko'] as const;

/** A supported language code (`'en' | 'es' | 'zh' | 'ko'`). */
export type Language = (typeof LANGUAGES)[number];

/** Human-readable English names for each supported language. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = Object.freeze({
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
});

/** Type guard: is `value` one of the supported {@link Language} codes? */
export const isSupportedLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
