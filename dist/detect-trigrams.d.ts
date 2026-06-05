/**
 * GENERATED FILE — DO NOT HAND-EDIT.
 *
 * Regenerate with:  npm run build:trigrams
 *
 * Character-trigram language profiles (Cavnar–Trenkle style) used as a
 * lexical-free Spanish/English tiebreak. The profiles are built from compact
 * embedded common-word vocabulary lists (public-domain factual word-frequency
 * lists) in scripts/build-trigrams.ts — NOT from recited prose. The signal
 * lives in word-boundary trigrams (' de', 'os ', 'cio', ' th', 'he ', 'ing').
 *
 * Each value is an add-one-smoothed log-probability:
 *     logP(t) = Math.log((count(t) + 1) / (sumC + V))
 * where sumC = sum of kept counts and V = number of distinct kept trigrams for
 * that language (top 300 trigrams per language, ties broken by trigram
 * string ascending). TRIGRAM_FLOOR = Math.log(1 / max(sumC + V)) is the score
 * for a trigram absent from a profile. All numbers rounded to 6 decimals.
 */
export declare const ES_TRIGRAMS: Readonly<Record<string, number>>;
export declare const EN_TRIGRAMS: Readonly<Record<string, number>>;
export declare const TRIGRAM_FLOOR: number;
/**
 * Score an ALREADY-folded string (see `fold` in src/text-utils.ts) for
 * Spanish-vs-English lean using the trigram profiles above. PURE and
 * synchronous; needs no imports because its input is already folded.
 *
 * It applies the SAME extraction as the generator (lowercase → keep `[a-z]` →
 * one-space pad → length-3 substrings) and returns the mean per-trigram
 * difference `(ES_TRIGRAMS[t] ?? FLOOR) - (EN_TRIGRAMS[t] ?? FLOOR)`. Positive
 * ⇒ Spanish-leaning, negative ⇒ English-leaning, 0 ⇒ no trigrams.
 */
export declare const trigramScore: (folded: string) => number;
//# sourceMappingURL=detect-trigrams.d.ts.map