/**
 * Recognition of NON-LINGUISTIC spans — URLs, emails, @handles, bare domains —
 * that carry no language signal and must never be translated.
 *
 * Two consumers:
 *   • detection ({@link stripNonLinguistic}): these spans are removed before any
 *     scoring, so tokens inside a URL (`/r/VideosAmazing` → `videos`) cannot hit
 *     a language lexicon and skew the result.
 *   • translation ({@link segmentText}): text is split into translatable and
 *     pass-through segments, so a URL embedded in a sentence is reattached
 *     VERBATIM around the translated prose rather than fed to the model.
 */
/** One run of input text: either translatable prose or a verbatim span. */
export interface TextSegment {
    text: string;
    /** `false` for URLs / emails / handles — spans to pass through untouched. */
    translatable: boolean;
}
/**
 * Split `text` into an ordered list of segments that concatenates back to the
 * exact input. Non-linguistic spans (URLs, emails, @handles, bare domains) come
 * back with `translatable: false`; everything between them, `true`.
 */
export declare const segmentText: (text: string) => TextSegment[];
/**
 * Remove non-linguistic spans for language DETECTION, replacing each with a
 * space so adjacent words don't fuse. The result is for scoring only — it does
 * not concatenate back to the input.
 */
export declare const stripNonLinguistic: (text: string) => string;
//# sourceMappingURL=non-linguistic.d.ts.map