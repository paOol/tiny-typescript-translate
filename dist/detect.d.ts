import { type Language } from './languages.js';
/** The result of a language-detection call. */
export interface DetectionResult {
    /** The most likely language. */
    language: Language;
    /** Confidence in `language`, from 0 (uncertain) to 1 (certain). */
    confidence: number;
    /**
     * Normalized score for every supported language. Scores sum to ~1, so they
     * can be read as rough probabilities.
     */
    scores: Record<Language, number>;
}
/**
 * Detect which supported language a piece of text is written in.
 *
 * Detection is fully offline, synchronous, dependency-free and deterministic.
 * Chinese and Korean are identified purely by Unicode script. Spanish and
 * English (which share the Latin alphabet) are separated by a layered pipeline:
 * Spanish-specific characters, accent-FOLDED function-word matching (so an
 * accent-stripped Spanish sentence still matches its stopwords), a folded
 * Spanish content-word lexicon, and a character-trigram tiebreak for novel
 * accent-free fragments (see {@link classifyLatin}).
 *
 * Non-linguistic spans — URLs, emails, @handles, bare domains — are stripped
 * before scoring, so e.g. a Reddit URL containing `/r/VideosAmazing` cannot be
 * read as Spanish. Input that is ONLY such spans returns the no-signal result
 * (`en` with `confidence: 0`).
 *
 * Accuracy is highest on a full sentence or more, but many very short
 * accent-free Spanish fragments are now handled too. Trigram-only fragment
 * calls carry a modest `confidence` (~0.55–0.8); a one- or two-word fragment of
 * words in no list with a weak trigram signal may still fall back to English.
 *
 * @param text - the text to analyze.
 * @throws {@link DetectionError} if `text` is not a non-empty string.
 *
 * @example
 * ```ts
 * detectLanguage('The quick brown fox').language; // 'en'
 * detectLanguage('El zorro marrón rápido').language; // 'es'
 * detectLanguage('敏捷的棕色狐狸').language; // 'zh'
 * detectLanguage('빠른 갈색 여우').language; // 'ko'
 * ```
 */
export declare const detectLanguage: (text: string) => DetectionResult;
//# sourceMappingURL=detect.d.ts.map