import { LANGUAGES } from './languages.js';
import { DetectionError } from './errors.js';
import { ENGLISH_STOPWORDS, ENGLISH_COLLOQUIAL_FOLDED, SPANISH_CHARS, SPANISH_STOPWORDS_FOLDED, SPANISH_CONTENT_FOLDED, } from './detect-data.js';
import { fold } from './text-utils.js';
import { stripNonLinguistic } from './non-linguistic.js';
import { trigramScore } from './detect-trigrams.js';
/**
 * Phase-1 scoring weights for the Spanish/English sub-classifier — TUNED in
 * Task 3.1 by sweeping against the shipped CORPUS plus a set of genuine
 * out-of-lexicon Spanish fragments, subject to zero English→Spanish flips on
 * the en-control gate. Ordering invariant: `W_FUNC <= W_CONTENT <= W_ACCENT`.
 *
 * The sweep ({W_ACCENT∈2,3}, {W_CONTENT∈1,2}, W_FUNC=1) found these weights
 * accuracy-neutral on the corpus (a Spanish-specific char or content-word hit
 * already decides the fragment regardless of the exact multiplier), so we keep
 * the minimal values that satisfy the ordering invariant.
 */
const W_ACCENT = 2; // weight per Spanish-specific char (ñ, ¿, accented vowels…)
const W_FUNC = 1; // weight per function-word hit
const W_CONTENT = 1; // weight per content-word hit
// English-evidence weight per recognized colloquial token (slang / gaming /
// chat abbreviation; see ENGLISH_COLLOQUIAL_FOLDED). DECISIVE on purpose — set
// equal to W_ACCENT (the strongest Spanish per-token signal) so one recognized
// English slang token outweighs one lone, ambiguous Spanish stopword. This is
// what flips `sus` (also Spanish "their"), `no cap` and `sus imposter` back to
// English without any trigram involvement. Invariant: W_FUNC <= W_EN_SLANG.
const W_EN_SLANG = 2; // weight per English colloquial-token hit
// Trigram tiebreak thresholds — TUNED in Task 3.1.
//
// Task 2.1's EN trigram profile was rebuilt to add real running-text English
// frequencies (-ar/-ed/-ing/-ly/-s endings and common content words), which
// dropped the en-control "red car" trigram score from +0.67 to -0.65. The new
// binding en-control case is "quick test" at +0.337, so the lowest flat margin
// that holds the hard "zero English→Spanish flips" gate is just above 0.337.
// 0.35 sits just over that worst en-control score (small safety buffer) and was
// the accuracy-maximizing choice in the sweep: corpus 48/48 with 12/14 of the
// genuine out-of-lexicon Spanish fragments recovered (only two scoring < 0.337
// stay English — unrecoverable by a flat margin without flipping "quick test").
const TRIGRAM_MARGIN = 0.35; // tuned: just above worst en-control "quick test" (+0.337)
const TIE_MARGIN = 0; // tuned: only consult trigrams on an exact lexical tie (esRaw === enRaw)
// Confidence band for trigram-only decisions (the tiebreak branches).
//
// A trigram-only call is a WEAK signal: there is no lexical (function-word /
// accent / content-word) evidence, only character-shape statistics. So its
// confidence is deliberately squashed into this modest band, well below the
// near-1.0 confidence a function-word-rich full sentence gets from the
// normalized lexical split. Callers can therefore tell a weak fragment call
// apart from a strong full-sentence call by inspecting `confidence`.
const TRIGRAM_CONF_MIN = 0.55; // floor: a barely-decisive trigram lean (|t| just past the margin)
const TRIGRAM_CONF_MAX = 0.8; // ceiling: a strongly-decisive trigram lean (large |t|)
// Trigram Spanish-flip guard (H2) — reduces English→Spanish false positives on
// internet slang, gaming terms and short common-English fragments that have NO
// lexical evidence and so reach the trigram tiebreak. The trigram model reads
// short English chat tokens (`imo`, `bro`, `camp`, `ez`…) as Spanish because
// clusters like `us `/`ta `/`que`/`est` are Spanish-skewed. We therefore allow
// a trigram-only result to flip to SPANISH only when the fragment looks like it
// could plausibly BE Spanish:
//
//   • at least MIN_ES_FLIP_LETTERS folded letters — suppresses ultra-short slang
//     noise. Safe floor: every genuine out-of-lexicon Spanish fragment in the
//     corpus (`es-trigram-novel`) is ≥ 10 letters, leaving a ≥ 2-letter buffer.
//   • no `k`/`w` — letters near-absent in native Spanish but common in English /
//     loanword slang (`wtf`, `kek`, `owned`, `webcam`…); a forward-looking net
//     for novel slang not in the colloquial lexicon.
//
// CRITICAL: this gates ONLY the Spanish-flip direction. English trigram flips
// and the entire lexical path are untouched — the failure mode is strictly
// English→Spanish, so the guard is monotone toward English and cannot regress
// any genuine English case.
const MIN_ES_FLIP_LETTERS = 8;
const NON_SPANISH_LETTERS = /[kw]/; // k/w essentially never occur in native Spanish
const HANGUL_RE = /\p{Script=Hangul}/gu;
const HAN_RE = /\p{Script=Han}/gu;
const LATIN_RE = /\p{Script=Latin}/gu;
const LATIN_WORD_RE = /[\p{Script=Latin}]+/gu;
const countMatches = (text, re) => (text.match(re) ?? []).length;
/**
 * H2 guard: may a trigram-ONLY result flip to Spanish? Returns `false` for
 * fragments too short, or carrying `k`/`w`, to plausibly be native Spanish —
 * which keeps English the default for short slang / gaming / chat fragments that
 * have no lexical evidence. Pure; `folded` is the already-folded input.
 *
 * Gates only the es-flip direction (see {@link MIN_ES_FLIP_LETTERS}); English
 * trigram flips are never gated.
 */
const spanishFlipAllowed = (folded) => {
    const letters = folded.replace(/[^a-z]/g, '');
    return letters.length >= MIN_ES_FLIP_LETTERS && !NON_SPANISH_LETTERS.test(letters);
};
/**
 * Distinguish Spanish from English within Latin-script text using a layered,
 * fully offline signal stack, in order:
 *
 * 1. A Spanish-specific CHARACTER signal (`ñ`, `¿`, `¡`, accented vowels), read
 *    on the RAW text before any folding (folding would strip these characters).
 * 2. Accent-FOLDED FUNCTION-word matching (Spanish vs. English stopwords).
 *    Folding (`NFD` + strip diacritics + lowercase, `ñ → n`) means an
 *    accent-stripped Spanish sentence still matches its stopwords.
 * 3. A FOLDED Spanish CONTENT-word lexicon (high-frequency content words,
 *    curated to avoid common-English collisions) — this catches short
 *    accent-free fragments like `buenos dias` or `gracias amigo`.
 * 4. A character-TRIGRAM tiebreak ({@link trigramScore}), consulted ONLY when
 *    there is no lexical evidence or an exact lexical tie. This classifies novel
 *    accent-free Spanish fragments built from words in no list (e.g.
 *    `carretera estrecha`); English stays the default on a genuine tie. The
 *    Spanish-flip direction is additionally guarded by {@link spanishFlipAllowed}
 *    so short / `k`·`w`-bearing English slang cannot be read as Spanish.
 *
 * On the English side, a folded ENGLISH COLLOQUIAL lexicon (slang, gaming terms,
 * chat abbreviations — `ENGLISH_COLLOQUIAL_FOLDED`) supplies decisive English
 * evidence (weight `W_EN_SLANG`), so internet slang and short English fragments
 * are not misread as Spanish (e.g. `sus`, `no cap`, `vibe`, `side quest`).
 *
 * @returns the share of evidence pointing at each language (each in `[0, 1]`,
 *   together summing to 1). A trigram-only (tiebreak) decision carries a modest
 *   split (see `TRIGRAM_CONF_*`); lexically-clear text leans hard one way.
 */
const classifyLatin = (text) => {
    // Accent signal must be read from the RAW text: folding strips ñ/accents,
    // which would destroy the very characters that make this a Spanish signal.
    const accent = countMatches(text, SPANISH_CHARS);
    // Tokenize the raw text (LATIN_WORD_RE matches Latin-script runs, accents and
    // case included), then fold each token before matching the folded word sets.
    const tokens = text.match(LATIN_WORD_RE) ?? [];
    let esFunc = 0;
    let enFunc = 0;
    let esContent = 0;
    let enSlang = 0;
    for (const token of tokens) {
        const f = fold(token);
        if (SPANISH_STOPWORDS_FOLDED.has(f))
            esFunc += 1;
        // ENGLISH_STOPWORDS is already lowercase/diacritic-free, so matching the
        // folded token is correct and equivalent to the previous lowercased match.
        if (ENGLISH_STOPWORDS.has(f))
            enFunc += 1;
        if (SPANISH_CONTENT_FOLDED.has(f))
            esContent += 1;
        // English colloquial (slang / gaming / abbreviation) hit — decisive English
        // evidence (H1). Counted independently of the stopword check so a token that
        // is both a Spanish stopword and English slang (e.g. `sus`) nets English.
        if (ENGLISH_COLLOQUIAL_FOLDED.has(f))
            enSlang += 1;
    }
    const esRaw = accent * W_ACCENT + esFunc * W_FUNC + esContent * W_CONTENT;
    const enRaw = enFunc * W_FUNC + enSlang * W_EN_SLANG;
    const total = esRaw + enRaw;
    // Fold the whole string once for the trigram path. `trigramScore` re-tokenizes
    // internally, so folding the entire string here is correct and avoids a second
    // fold pass. Available to both the zero-evidence and near-tie branches below.
    const folded = fold(text);
    // Map a decisive trigram score to a leaning split with a BOUNDED confidence.
    //
    // On the decisive branches `|t|` is always > TRIGRAM_MARGIN. We squash the
    // distance past the margin smoothly and monotonically into the modest band
    // [TRIGRAM_CONF_MIN, TRIGRAM_CONF_MAX]. The chosen squash is the saturating
    // exponential `1 - e^(-2·x)`: it is pure & deterministic (no Date/random),
    // 0 at the margin, monotonically increasing, and bounded in [0, 1) — so a
    // barely-decisive lean lands near MIN and a strongly-decisive one approaches
    // (but never exceeds) MAX. This keeps trigram-only confidence modest while
    // preserving "stronger trigram evidence ⇒ higher confidence" ordering.
    const trigramConfidenceSplit = (t) => {
        const mag = Math.abs(t);
        const x = Math.max(0, mag - TRIGRAM_MARGIN); // distance past the margin
        const k = 1 - Math.exp(-x * 2); // 0 at margin → →1 as mag grows (bounded, smooth)
        const conf = TRIGRAM_CONF_MIN + (TRIGRAM_CONF_MAX - TRIGRAM_CONF_MIN) * k;
        return t > 0 ? { es: conf, en: 1 - conf } : { es: 1 - conf, en: conf };
    };
    if (total === 0) {
        // No accent chars and no function/content/slang-word hits: consult the
        // trigram tiebreak. A decisive lean flips off the conventional English
        // default — but a Spanish flip is allowed only when the fragment could
        // plausibly be Spanish (H2 guard); short slang/abbreviations stay English.
        const t = trigramScore(folded);
        if (t > TRIGRAM_MARGIN && spanishFlipAllowed(folded))
            return trigramConfidenceSplit(t);
        if (t < -TRIGRAM_MARGIN)
            return trigramConfidenceSplit(t);
        return { es: 0, en: 1 }; // genuine tie / no signal: English default (unchanged)
    }
    // Lexical evidence exists but is an exact/near tie → consult trigram as a
    // tiebreak. With TIE_MARGIN = 0 this only fires when esRaw === enRaw (the
    // ambiguous one-es + one-en case); a CLEAR lexical margin is never overridden.
    // The same H2 guard applies to the Spanish-flip direction.
    if (Math.abs(esRaw - enRaw) <= TIE_MARGIN) {
        const t = trigramScore(folded);
        if (t > TRIGRAM_MARGIN && spanishFlipAllowed(folded))
            return trigramConfidenceSplit(t);
        if (t < -TRIGRAM_MARGIN)
            return trigramConfidenceSplit(t);
        // else fall through to the normalized lexical split below
    }
    return { es: esRaw / total, en: enRaw / total };
};
const emptyScores = () => ({
    en: 0,
    es: 0,
    zh: 0,
    ko: 0,
});
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
export const detectLanguage = (text) => {
    if (typeof text !== 'string') {
        throw new DetectionError('detectLanguage expects a string.');
    }
    if (text.trim().length === 0) {
        throw new DetectionError('Cannot detect the language of empty text.');
    }
    // Score only the LINGUISTIC content: URLs, emails and @handles carry no
    // language signal, and tokens inside them (`/r/VideosAmazing` → `videos`)
    // would otherwise hit a lexicon and skew the result. A purely non-linguistic
    // input therefore falls through to the no-signal branch below (en, conf 0).
    const linguistic = stripNonLinguistic(text);
    const hangul = countMatches(linguistic, HANGUL_RE);
    const han = countMatches(linguistic, HAN_RE);
    const latin = countMatches(linguistic, LATIN_RE);
    const { es: pEs, en: pEn } = latin > 0 ? classifyLatin(linguistic) : { es: 0, en: 0 };
    const weights = {
        ko: hangul,
        zh: han,
        es: latin * pEs,
        en: latin * pEn,
    };
    const total = weights.ko + weights.zh + weights.es + weights.en;
    if (total === 0) {
        // No linguistic letters in any supported script (digits, punctuation,
        // emoji, or nothing but URLs / emails / @handles).
        return { language: 'en', confidence: 0, scores: emptyScores() };
    }
    const scores = {
        en: weights.en / total,
        es: weights.es / total,
        zh: weights.zh / total,
        ko: weights.ko / total,
    };
    let language = 'en';
    let best = -1;
    for (const lang of LANGUAGES) {
        if (scores[lang] > best) {
            best = scores[lang];
            language = lang;
        }
    }
    return { language, confidence: scores[language], scores };
};
//# sourceMappingURL=detect.js.map