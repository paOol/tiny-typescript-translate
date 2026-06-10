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
// Each alternative is matched case-insensitively. Order matters: an email must
// win over its bare-domain suffix (`a@gmail.com` must not leave `a@` behind),
// and scheme/www URLs over the bare-domain form so the path is included.
const SCHEME_URL = String.raw `[a-z][a-z0-9+.-]*:\/\/\S+`; // https://…, ftp://…
const WWW_URL = String.raw `www\.\S+`;
const EMAIL = String.raw `[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)+[a-z]{2,24}`;
// Bare domain (`reddit.com/r/foo`, `index.ts`). The final label must be 2+
// letters, so abbreviations like `e.g.` / `U.S.` are NOT matched.
const BARE_DOMAIN = String.raw `(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/\S*)?`;
const MENTION = String.raw `@[a-z0-9_](?:[a-z0-9_.]*[a-z0-9_])?`; // @handle
// The lookbehind keeps matches from starting mid-word or mid-address
// (e.g. the `gmail.com` tail of an email already consumed, or `b.co` in `a.b.co`).
const NON_LINGUISTIC_RE = new RegExp(String.raw `(?<![\w@.\/])(?:${SCHEME_URL}|${WWW_URL}|${EMAIL}|${BARE_DOMAIN}|${MENTION})`, 'gi');
// `\S+` in the URL forms swallows sentence punctuation hugging the span
// ("see https://x.com." / "(at reddit.com/r/foo)"). Trim it back off so it
// stays part of the surrounding — translatable — text.
const TRAILING_PUNCT_RE = /[.,;:!?…'")\]]+$/;
/**
 * Split `text` into an ordered list of segments that concatenates back to the
 * exact input. Non-linguistic spans (URLs, emails, @handles, bare domains) come
 * back with `translatable: false`; everything between them, `true`.
 */
export const segmentText = (text) => {
    const segments = [];
    let last = 0;
    for (const match of text.matchAll(NON_LINGUISTIC_RE)) {
        const span = match[0].replace(TRAILING_PUNCT_RE, '');
        if (span.length === 0)
            continue;
        if (match.index > last) {
            segments.push({ text: text.slice(last, match.index), translatable: true });
        }
        segments.push({ text: span, translatable: false });
        last = match.index + span.length;
    }
    if (last < text.length) {
        segments.push({ text: text.slice(last), translatable: true });
    }
    return segments;
};
/**
 * Remove non-linguistic spans for language DETECTION, replacing each with a
 * space so adjacent words don't fuse. The result is for scoring only — it does
 * not concatenate back to the input.
 */
export const stripNonLinguistic = (text) => segmentText(text)
    .map((segment) => (segment.translatable ? segment.text : ' '))
    .join('');
//# sourceMappingURL=non-linguistic.js.map