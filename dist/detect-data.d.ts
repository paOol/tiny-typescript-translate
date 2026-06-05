/**
 * Static frequency data used by the Spanish/English sub-classifier.
 *
 * Chinese and Korean are separated from Latin-script text purely by Unicode
 * script analysis (see `detect.ts`); the only genuinely hard call for these
 * four languages is Spanish vs. English, since they share the Latin alphabet.
 * High-frequency function words ("stopwords") are an extremely cheap and
 * reliable signal for that distinction.
 */
/** Common Spanish function words. */
export declare const SPANISH_STOPWORDS: ReadonlySet<string>;
/** Common English function words. */
export declare const ENGLISH_STOPWORDS: ReadonlySet<string>;
/**
 * Characters that essentially never appear in English but are common in
 * Spanish. Their mere presence is a strong Spanish signal.
 */
export declare const SPANISH_CHARS: RegExp;
/**
 * Accent-folded view of {@link SPANISH_STOPWORDS}, used when comparing against
 * tokens that have already been folded (NFD-stripped, lowercased) by
 * {@link fold}. Folding collapses accented forms to their bare ASCII shape
 * (e.g. `más`→`mas`, `qué`→`que`, `él`→`el`, `está`→`esta`, `cómo`→`como`,
 * `también`→`tambien`). A few bare forms are added explicitly so they are
 * present even though only their accented variant appears above.
 */
export declare const SPANISH_STOPWORDS_FOLDED: ReadonlySet<string>;
/**
 * Curated high-frequency Spanish CONTENT words, stored in accent-folded form
 * (see {@link fold}). Compared against folded tokens to add a Spanish signal
 * beyond function words.
 *
 * Accuracy-first curation rule: every entry's folded form must NOT be a common
 * English word, and must not collide with {@link ENGLISH_STOPWORDS}. Words
 * whose folded form is ambiguous with English (e.g. `son`, `red`, `pan`,
 * `mango`, `mango`, `gato`→fine but `come`, `van`, `ten`, `mar`, `ser`, `ir`,
 * `vista`, `real`, `final`, `total`, `normal`, `central`, `idea`, `area`,
 * `radio`, `video`, `animal`, `error`, `doctor`, `hotel`, `hospital`, `mango`,
 * `sol`/`sole`, `mesa`, `rio`, `gana`, `paso`, `fin`, `as`, `me`) are
 * intentionally EXCLUDED; the Phase 2 trigram tiebreak covers them generically.
 * `mas` is a function word (in {@link SPANISH_STOPWORDS_FOLDED}) and is also
 * denylisted for content, so it is kept OUT here.
 */
export declare const SPANISH_CONTENT_FOLDED: ReadonlySet<string>;
/**
 * Curated English COLLOQUIAL lexicon: internet slang, gaming terms, chat
 * abbreviations, and the few short everyday English words the function-word
 * list omits (notably `side`/`quest`). Stored accent-folded — English has no
 * diacritics, so each entry is plain lowercase ASCII.
 *
 * Why this exists: Latin-script slang and short English fragments carry no
 * Spanish/English function or content word, so they fall into `classifyLatin`'s
 * character-trigram tiebreak — which leans Spanish on English chat shapes
 * (`vibe`, `imo`, `bro`, `side quest`, …). Matching a token here adds DECISIVE
 * English evidence (weighted `W_EN_SLANG` in `detect.ts`), so a recognized slang
 * token outweighs a lone ambiguous Spanish stopword and never reaches trigrams.
 *
 * Curation rule (mirror of the {@link SPANISH_CONTENT_FOLDED} rule): every entry
 * MUST NOT be a common Spanish word, so adding it can never make genuine Spanish
 * text read English. Excluded as Spanish-ambiguous: `meta` (Sp. "goal"), `como`,
 * `son`, `red`, `real`, `final`, `total`, `normal`, `sol`, `mar`, `ser`, `ir`,
 * `van`, `ten`, `una`, `uno`, `vista`, `radio`, `video`, `animal`, `error`,
 * `hotel`, and every Spanish stopword (`ya`, `tu`, `mi`, `si`, `no`, `se`…).
 *
 * Documented exception: `sus` is intentionally included even though it is also a
 * Spanish possessive stopword — bare `sus` is overwhelmingly English/gaming
 * slang ("suspicious"), while Spanish `sus` never stands alone (it precedes a
 * noun). This single overlap is asserted in `test/detect-data.test.ts`.
 */
export declare const ENGLISH_COLLOQUIAL_FOLDED: ReadonlySet<string>;
//# sourceMappingURL=detect-data.d.ts.map