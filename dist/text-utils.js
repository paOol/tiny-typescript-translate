/**
 * Accent-fold and lowercase a string for language-detection comparisons.
 *
 * Decomposes characters (NFD), strips combining diacritics, then lowercases.
 * NOTE: this intentionally maps `ñ → n` (ñ decomposes to `n` + combining
 * tilde, which is then stripped). Because of that, any Spanish-specific
 * CHARACTER signal (e.g. matching `ñ`, accented vowels) MUST be read from the
 * RAW text BEFORE calling `fold`.
 *
 * Pure, synchronous, allocation-light; safe to call per token.
 */
export const fold = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
//# sourceMappingURL=text-utils.js.map