/**
 * Labeled fragment corpus for language-detection accuracy work.
 *
 * Each entry is a short piece of text paired with the language a human would
 * assign it and a {@link CorpusKind} describing why it is interesting. The
 * corpus deliberately stresses the Spanish-vs-English boundary, which is the
 * only genuinely hard call for the four supported languages.
 *
 * Why these buckets exist:
 * - `es-accented` and `en-control` are the "easy" cases the detector already
 *   handles and must never regress on.
 * - `es-accentfree-lexicon` and `es-accentfree-novel` capture the known bug:
 *   short accent-free Spanish content fragments are misdetected as English
 *   because `classifyLatin` has no content lexicon and no trigram fallback yet.
 *   (Both are now FIXED — the content lexicon covers every entry in both kinds.)
 * - `es-trigram-novel` holds accent-free Spanish fragments whose every word is
 *   in NEITHER the Spanish content lexicon NOR the stopword sets, so they carry
 *   ZERO lexical evidence and can ONLY be decided by the character-trigram
 *   tiebreak. This is the kind that actually exercises the trigram path; the
 *   older `es-accentfree-novel` entries all turned out to be lexicon-covered.
 * - `es-stripped-sentence` holds full Spanish sentences with their accents
 *   removed; these still carry enough Spanish function words to be detected
 *   today, so they guard against breaking the folded-function-word path.
 * - `en-slang`, `en-gaming`, `en-short-fragment` capture English internet slang,
 *   gaming terms and short common-English fragments that a Latin-script detector
 *   can misread as Spanish (the trigram tiebreak leans Spanish on English chat
 *   shapes; `sus`/`no cap` collide with Spanish stopwords). They are the
 *   regression gate for the slang false-positive guard — every entry must
 *   detect English (zero English→Spanish flips).
 *
 * The corpus is intentionally deterministic (no randomness, no dates) so the
 * baseline accuracy report is reproducible across runs and machines.
 */

import type { Language } from '../../src/languages.js';

/** Why a given corpus entry exists / what it is meant to exercise. */
export type CorpusKind =
  | 'es-accented'
  | 'es-accentfree-lexicon'
  | 'es-accentfree-novel'
  | 'es-trigram-novel'
  | 'en-control'
  | 'es-stripped-sentence'
  // English false-positive guards: internet slang, gaming terms, and short
  // common-English fragments that a Latin-script detector can misread as
  // Spanish. All `expected: 'en'`; every one of these is a regression gate
  // against English→Spanish flips. (Added with the slang false-positive guard.)
  | 'en-slang'
  | 'en-gaming'
  | 'en-short-fragment';

/** A single labeled fragment in the detection corpus. */
export interface CorpusEntry {
  /** The raw text to feed to `detectLanguage`. */
  text: string;
  /** The language a human reader would assign to `text`. */
  expected: Language;
  /** Which stress-test bucket this entry belongs to. */
  kind: CorpusKind;
}

/**
 * The labeled corpus. Each {@link CorpusKind} is seeded with at least eight
 * entries. Ordering is stable and meaningful only for readability.
 */
export const CORPUS: ReadonlyArray<CorpusEntry> = [
  // --- es-accented: accents / inverted punctuation make these unambiguous ---
  { text: 'buenos días', expected: 'es', kind: 'es-accented' },
  { text: 'marrón rápido', expected: 'es', kind: 'es-accented' },
  { text: '¿cómo estás?', expected: 'es', kind: 'es-accented' },
  { text: 'niños pequeños', expected: 'es', kind: 'es-accented' },
  { text: 'el señor', expected: 'es', kind: 'es-accented' },
  { text: 'mañana será', expected: 'es', kind: 'es-accented' },
  { text: 'está aquí', expected: 'es', kind: 'es-accented' },
  { text: 'qué tal', expected: 'es', kind: 'es-accented' },
  { text: '¡feliz año!', expected: 'es', kind: 'es-accented' },
  { text: 'corazón roto', expected: 'es', kind: 'es-accented' },

  // --- es-accentfree-lexicon: common Spanish words, no accents (KNOWN BUG) ---
  { text: 'buenos dias', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'marron rapido', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'gracias amigo', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'hola mundo', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'feliz cumpleanos', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'muchas gracias', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'casa grande', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'perro pequeno', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'hasta luego', expected: 'es', kind: 'es-accentfree-lexicon' },
  { text: 'por favor', expected: 'es', kind: 'es-accentfree-lexicon' },

  // --- es-accentfree-novel: clearly-Spanish words unlikely to be in a small
  //     lexicon, and crucially NOT common English words (KNOWN BUG) ---
  { text: 'pelota verde', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'ventana abierta', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'camisa azul', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'mesa redonda', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'zapato roto', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'caballo blanco', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'pajaro pequeno', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'lluvia fuerte', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'nube gris', expected: 'es', kind: 'es-accentfree-novel' },
  { text: 'puerta cerrada', expected: 'es', kind: 'es-accentfree-novel' },

  // --- es-trigram-novel: GENUINELY out-of-lexicon, accent-free Spanish. Every
  //     word here is in NEITHER SPANISH_CONTENT_FOLDED NOR the stopword sets, so
  //     these fragments carry ZERO lexical evidence and are decided purely by the
  //     character-trigram tiebreak (the only kind that truly exercises it). Each
  //     trailing comment is the current trigramScore(fold(text)); all sit above
  //     TRIGRAM_MARGIN (0.35) and detect as `es` under the tuned constants. ---
  { text: 'jarra llena', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 1.318
  { text: 'cuchara sucia', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.939
  { text: 'cazadora cansada', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.866
  { text: 'maceta rajada', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.725
  { text: 'manzana podrida', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.702
  { text: 'bombilla quemada', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.605
  { text: 'sendero rocoso', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.595
  { text: 'alfombra usada', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.590
  { text: 'carretera estrecha', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.417
  { text: 'naranja madura', expected: 'es', kind: 'es-trigram-novel' }, // ≈ 0.414

  // --- en-control: short English fragments; must always detect English ---
  { text: 'brown fox', expected: 'en', kind: 'en-control' },
  { text: 'quick test', expected: 'en', kind: 'en-control' },
  { text: 'good morning', expected: 'en', kind: 'en-control' },
  { text: 'happy birthday', expected: 'en', kind: 'en-control' },
  { text: 'green ball', expected: 'en', kind: 'en-control' },
  { text: 'blue sky', expected: 'en', kind: 'en-control' },
  { text: 'big house', expected: 'en', kind: 'en-control' },
  { text: 'small dog', expected: 'en', kind: 'en-control' },
  { text: 'red car', expected: 'en', kind: 'en-control' },
  { text: 'open window', expected: 'en', kind: 'en-control' },

  // --- es-stripped-sentence: accent-stripped full Spanish sentences. The
  //     first three are the exact Spanish sentences from detect.test.ts with
  //     accents removed (á→a é→e í→i ó→o ú→u ñ→n ü→u, and ¿¡ dropped). ---
  {
    text: 'El zorro marron rapido salta sobre el perro perezoso.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'Me gustaria aprender a escribir mejor codigo.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'Hola, como estas? Espero que todo vaya bien contigo.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'Hoy fui al mercado a comprar pan y leche para la cena.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'El nino corre por el parque mientras su madre lo observa.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'No se que vamos a hacer cuando llegue el invierno.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'Maria y Juan viven en una casa pequena cerca del rio.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },
  {
    text: 'Manana por la manana saldremos temprano hacia la montana.',
    expected: 'es',
    kind: 'es-stripped-sentence',
  },

  // --- en-slang: internet/text slang & chat abbreviations. All previously at
  //     risk of (or actually) flipping to Spanish via the trigram tiebreak or a
  //     Spanish-stopword collision (`sus`, `imo`, `vibe`, `no cap`…). Must be en.
  { text: 'lol', expected: 'en', kind: 'en-slang' },
  { text: 'lmao', expected: 'en', kind: 'en-slang' },
  { text: 'tbh', expected: 'en', kind: 'en-slang' },
  { text: 'ngl', expected: 'en', kind: 'en-slang' },
  { text: 'imo', expected: 'en', kind: 'en-slang' }, // was es (trigram)
  { text: 'sus', expected: 'en', kind: 'en-slang' }, // was es=1.0 (Spanish stopword)
  { text: 'periodt', expected: 'en', kind: 'en-slang' }, // was es (trigram)
  { text: 'vibe', expected: 'en', kind: 'en-slang' }, // was es (trigram)
  { text: 'vibes', expected: 'en', kind: 'en-slang' }, // was es (trigram)
  { text: 'bruh', expected: 'en', kind: 'en-slang' },
  { text: 'bro', expected: 'en', kind: 'en-slang' }, // was es (trigram)
  { text: 'based', expected: 'en', kind: 'en-slang' },
  { text: 'cringe', expected: 'en', kind: 'en-slang' },
  { text: 'deadass', expected: 'en', kind: 'en-slang' },
  { text: 'sheesh', expected: 'en', kind: 'en-slang' },

  // --- en-gaming: gaming terms & callouts. `ez`, `gg ez`, `ggez`, `camp`,
  //     `meta` all previously flipped to Spanish. Must be en. ---
  { text: 'gg', expected: 'en', kind: 'en-gaming' },
  { text: 'ez', expected: 'en', kind: 'en-gaming' }, // was es (trigram)
  { text: 'gg ez', expected: 'en', kind: 'en-gaming' }, // was es (trigram)
  { text: 'ggez', expected: 'en', kind: 'en-gaming' }, // was es (trigram)
  { text: 'noob', expected: 'en', kind: 'en-gaming' },
  { text: 'pwned', expected: 'en', kind: 'en-gaming' },
  { text: 'clutch', expected: 'en', kind: 'en-gaming' },
  { text: 'camp', expected: 'en', kind: 'en-gaming' }, // was es (trigram)
  { text: 'meta', expected: 'en', kind: 'en-gaming' }, // was es (trigram)
  { text: 'nerf', expected: 'en', kind: 'en-gaming' },
  { text: 'tryhard', expected: 'en', kind: 'en-gaming' },
  { text: 'headshot', expected: 'en', kind: 'en-gaming' },
  { text: 'gg wp', expected: 'en', kind: 'en-gaming' },
  { text: 'mid diff', expected: 'en', kind: 'en-gaming' },
  { text: 'jungle diff', expected: 'en', kind: 'en-gaming' },

  // --- en-short-fragment: short common-English phrases (incl. the gaming-meme
  //     phrases that read like English). `no cap` and `side quest` previously
  //     flipped to Spanish. Must be en. ---
  { text: 'no cap', expected: 'en', kind: 'en-short-fragment' }, // was es (tie→trigram)
  { text: 'side quest', expected: 'en', kind: 'en-short-fragment' }, // was es (trigram)
  { text: 'sus imposter', expected: 'en', kind: 'en-short-fragment' }, // was es (sus stopword)
  { text: 'big mood', expected: 'en', kind: 'en-short-fragment' },
  { text: 'my bad', expected: 'en', kind: 'en-short-fragment' },
  { text: 'all good', expected: 'en', kind: 'en-short-fragment' },
  { text: 'so true', expected: 'en', kind: 'en-short-fragment' },
  { text: 'real talk', expected: 'en', kind: 'en-short-fragment' },
  { text: 'main character', expected: 'en', kind: 'en-short-fragment' },
  { text: 'touch grass', expected: 'en', kind: 'en-short-fragment' },
  { text: 'let him cook', expected: 'en', kind: 'en-short-fragment' },
  { text: 'skill issue', expected: 'en', kind: 'en-short-fragment' },
  { text: 'hits different', expected: 'en', kind: 'en-short-fragment' },
  { text: 'say less', expected: 'en', kind: 'en-short-fragment' },
  { text: 'on god', expected: 'en', kind: 'en-short-fragment' },
];
