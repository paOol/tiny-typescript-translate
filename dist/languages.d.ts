/**
 * The set of languages supported by this library.
 *
 * Codes are ISO 639-1 and intentionally match the language codes used by the
 * underlying m2m100 translation model, so they can be passed straight through.
 */
export declare const LANGUAGES: readonly ["en", "es", "zh", "ko"];
/** A supported language code (`'en' | 'es' | 'zh' | 'ko'`). */
export type Language = (typeof LANGUAGES)[number];
/** Human-readable English names for each supported language. */
export declare const LANGUAGE_NAMES: Readonly<Record<Language, string>>;
/** Type guard: is `value` one of the supported {@link Language} codes? */
export declare const isSupportedLanguage: (value: unknown) => value is Language;
//# sourceMappingURL=languages.d.ts.map