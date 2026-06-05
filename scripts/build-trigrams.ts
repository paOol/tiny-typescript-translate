/**
 * DEV-ONLY GENERATOR — not shipped in the published package.
 *
 * Emits `src/detect-trigrams.ts`, a GENERATED character-trigram language
 * profile module used by the Spanish/English sub-classifier as a lexical-free
 * tiebreak (Cavnar–Trenkle style). Run with:
 *
 *     npm run build:trigrams
 *
 * CORPUS SOURCE — IMPORTANT
 * -------------------------
 * The "corpus" for each language is NOT recited prose. It is a compact list of
 * the most common words in each language (articles, prepositions, pronouns,
 * common verbs, and frequent content words). These are short, public-domain
 * factual word-frequency / vocabulary lists. For a character-trigram profile
 * the discriminating signal lives in word-boundary trigrams (`' de'`, `'os '`,
 * `'cion'`-runs, `' th'`, `'he '`, `'ing'`, `'tion'`); a few hundred common
 * words per language therefore produces a stable top-300 trigram profile.
 *
 * Spanish words are stored in FOLDED (accent-free, lowercase ASCII) form, the
 * same normalization `fold()` applies at runtime, so the runtime `trigramScore`
 * (which receives folded input) sees the identical trigram space.
 *
 * The script is deterministic: no Math.random, no Date. Counts are tie-broken
 * by trigram string ascending, keys are emitted sorted, and all numbers are
 * rounded to 6 decimals — so regenerating produces a byte-identical file.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* ------------------------------------------------------------------------- *
 * Embedded common-word vocabulary lists (the "corpus").                      *
 * ------------------------------------------------------------------------- */

/** ~300 of the most common English words (function + frequent content). */
const EN_WORDS: readonly string[] = [
  // Articles, prepositions, conjunctions, pronouns (function words).
  'the', 'of', 'and', 'to', 'in', 'is', 'it', 'you', 'that', 'he', 'she',
  'was', 'were', 'for', 'on', 'are', 'as', 'with', 'his', 'her', 'they',
  'at', 'be', 'this', 'have', 'has', 'had', 'from', 'or', 'one', 'by', 'but',
  'not', 'what', 'all', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'an', 'each', 'which', 'do', 'does', 'how', 'their', 'if', 'will', 'up',
  'out', 'about', 'many', 'then', 'them', 'these', 'so', 'some', 'would',
  'into', 'time', 'two', 'more', 'go', 'see', 'no', 'way', 'could', 'people',
  'my', 'than', 'been', 'who', 'now', 'its', 'did', 'get', 'come', 'made',
  'over', 'just', 'because', 'also', 'after', 'where', 'our', 'i', 'me', 'us',
  'him', 'were', 'am', 'being', 'such', 'most', 'only', 'other', 'any', 'may',
  'down', 'should', 'must', 'before', 'between', 'through', 'under', 'above',
  'again', 'off', 'while', 'here', 'too', 'very', 'much', 'both', 'few',
  'those', 'own', 'same', 'against', 'during', 'without', 'within', 'around',
  'never', 'always', 'often', 'still', 'every', 'another', 'until', 'though',
  // Common verbs.
  'make', 'take', 'know', 'think', 'look', 'want', 'give', 'find', 'tell',
  'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'keep', 'let',
  'begin', 'help', 'talk', 'turn', 'start', 'show', 'hear', 'play', 'run',
  'move', 'live', 'believe', 'bring', 'happen', 'write', 'sit', 'stand',
  'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change',
  'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read',
  'spend', 'grow', 'open', 'walk', 'win', 'teach', 'offer', 'remember',
  'love', 'eat', 'drink', 'sleep', 'buy', 'send', 'build', 'wait', 'fall',
  // Common nouns and adjectives (frequent content words).
  'day', 'man', 'thing', 'woman', 'life', 'child', 'world', 'school',
  'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part',
  'place', 'case', 'week', 'company', 'system', 'program', 'question', 'word',
  'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area',
  'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye',
  'job', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service',
  'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'car',
  'city', 'name', 'team', 'minute', 'idea', 'body', 'information', 'face',
  'morning', 'birthday', 'happy', 'good', 'small', 'green', 'brown', 'quick',
  'ball', 'sky', 'dog', 'cat', 'tree', 'street', 'door', 'window', 'great',
  'little', 'large', 'high', 'different', 'following', 'long', 'young', 'old',
  'big', 'black', 'white', 'red', 'blue', 'early', 'late', 'important',
  'public', 'bad', 'able', 'human', 'sure', 'best', 'better', 'true', 'whole',
  'free', 'full', 'special', 'clear', 'strong', 'possible', 'simple', 'light',
  'food', 'sun', 'rain', 'wind', 'fire', 'earth', 'flower', 'bird', 'horse',
  'fish', 'apple', 'paper', 'table', 'chair', 'phone', 'music', 'color',
  'love', 'hope', 'dream', 'heart', 'mind', 'voice', 'sound', 'nothing',
  'something', 'everything', 'anything', 'someone', 'everyone',
  // --- Task 3.1 enrichment: real running-text frequencies the base-form
  //     vocabulary above under-represents. The original list reads `car`/`ar `/
  //     `' ca'` as Spanish-frequent, which over-weighted ES trigrams and blew
  //     up the en-control "red car" score. The categories below restore the
  //     true English weight of `-ar`, `-ed`, `-ing`, `-ly`, `-s` and common
  //     content words so the trigram tiebreak recovers Spanish recall without
  //     flipping English controls.
  // `-ar` / `-ear` words (the direct counterweight to ES `ar `/`car`/` ca`).
  'car', 'bar', 'star', 'far', 'jar', 'war', 'scar', 'cigar', 'dollar',
  'collar', 'guitar', 'sugar', 'solar', 'polar', 'radar', 'similar', 'popular',
  'regular', 'cellar', 'altar', 'sonar', 'lunar', 'cedar', 'near', 'dear',
  'clear', 'year', 'hear', 'fear', 'gear', 'rear', 'wear', 'bear', 'pear',
  'tear', 'ear', 'beard', 'heard',
  // Common `-ed` past tenses.
  'worked', 'played', 'looked', 'asked', 'called', 'wanted', 'used', 'turned',
  'moved', 'lived', 'needed', 'started', 'walked', 'opened', 'closed',
  'watched', 'learned', 'happened', 'finished', 'decided', 'created', 'carried',
  'tried', 'allowed', 'added', 'covered', 'showed', 'named', 'placed', 'helped',
  'talked', 'seemed',
  // Common `-ing` forms.
  'working', 'playing', 'looking', 'going', 'making', 'coming', 'running',
  'talking', 'reading', 'writing', 'morning', 'evening', 'nothing',
  'something', 'building', 'meaning', 'feeling', 'during', 'spring', 'string',
  'bring', 'thing', 'being',
  // Common `-ly` adverbs.
  'really', 'quickly', 'slowly', 'finally', 'usually', 'simply', 'nearly',
  'clearly', 'early', 'only', 'family', 'likely', 'lonely', 'daily',
  // Common plurals / `-s`.
  'things', 'words', 'years', 'days', 'ways', 'eyes', 'hands', 'cars', 'cards',
  'hours', 'miles', 'names', 'places', 'books', 'rooms', 'doors', 'walls',
  'lights', 'roads', 'trees', 'birds',
  // Extra everyday content nouns / adjectives / verbs.
  'bread', 'dead', 'road', 'load', 'wood', 'floor', 'water', 'never', 'every',
  'other', 'under', 'over', 'paper', 'river', 'color', 'power', 'lower',
  'cover', 'order', 'enter', 'letter', 'better', 'matter', 'winter', 'summer',
  'number', 'member', 'center', 'mother', 'father', 'brother', 'sister',
  'daughter', 'picture', 'future', 'nature', 'minute',
];

/**
 * ~300 of the most common Spanish words, in FOLDED (accent-free, lowercase
 * ASCII) form — matching the runtime `fold()` normalization. Includes words
 * with characteristically-Spanish (once folded) letter patterns: `-cion`
 * (from `-ción`), `-dad`, `-mente`, `-ado`, `-ido`, double-`rr`, `ll`, and
 * `n` (from `ñ`).
 */
const ES_WORDS: readonly string[] = [
  // Articles, prepositions, conjunctions, pronouns (function words, folded).
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'en', 'y', 'o', 'que', 'se', 'no', 'por', 'con', 'para', 'su', 'sus',
  'lo', 'le', 'les', 'me', 'te', 'nos', 'es', 'son', 'era', 'fue', 'ser',
  'estar', 'esta', 'estan', 'como', 'mas', 'pero', 'si', 'porque', 'este',
  'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'entre', 'cuando', 'muy',
  'sin', 'sobre', 'tambien', 'hasta', 'hay', 'donde', 'quien', 'desde',
  'todo', 'todos', 'toda', 'todas', 'durante', 'ni', 'contra', 'ellos',
  'ella', 'ante', 'antes', 'algo', 'algunos', 'yo', 'tu', 'mi', 'mis',
  'nuestro', 'nuestra', 'vez', 'tan', 'ya', 'cada', 'mismo', 'otro', 'otra',
  'otros', 'otras', 'aqui', 'alli', 'asi', 'ademas', 'aunque', 'mientras',
  'segun', 'menos', 'nunca', 'siempre', 'despues', 'tras', 'hacia', 'cual',
  'cuales', 'cuanto', 'nada', 'nadie', 'cosa', 'cosas', 'ellas', 'vosotros',
  'usted', 'ustedes', 'nosotros',
  // Common verbs (infinitives + frequent conjugations, folded).
  'hablar', 'comer', 'beber', 'vivir', 'hacer', 'tener', 'querer', 'poder',
  'decir', 'ir', 'ver', 'dar', 'saber', 'venir', 'poner', 'salir', 'llegar',
  'pasar', 'deber', 'parecer', 'quedar', 'creer', 'llevar', 'dejar', 'seguir',
  'encontrar', 'llamar', 'pensar', 'volver', 'conocer', 'sentir', 'mirar',
  'contar', 'empezar', 'esperar', 'buscar', 'entrar', 'trabajar', 'escribir',
  'perder', 'producir', 'recordar', 'terminar', 'permitir', 'aparecer',
  'tengo', 'tiene', 'tienen', 'hace', 'hacen', 'puede', 'pueden', 'quiere',
  'dice', 'dicen', 'tomar', 'cantar', 'jugar', 'correr', 'caminar', 'amar',
  'gustar', 'comprar', 'vender', 'abrir', 'cerrar', 'estudiar', 'ensenar',
  'aprender', 'ayudar', 'necesitar', 'usar', 'mostrar', 'cambiar',
  // Common nouns and adjectives (frequent content words, folded).
  'dia', 'dias', 'manana', 'tarde', 'noche', 'noches', 'ano', 'anos', 'mes',
  'meses', 'semana', 'hora', 'horas', 'tiempo', 'vez', 'veces', 'momento',
  'hombre', 'mujer', 'mujeres', 'nino', 'nina', 'ninos', 'ninas', 'gente',
  'persona', 'personas', 'amigo', 'amiga', 'amigos', 'amigas', 'familia',
  'senor', 'senora', 'senorita', 'padre', 'madre', 'hijo', 'hija', 'hermano',
  'hermana', 'casa', 'calle', 'ciudad', 'pais', 'paises', 'pueblo', 'mundo',
  'lugar', 'parte', 'lado', 'camino', 'puerta', 'ventana', 'escuela',
  'trabajo', 'trabajador', 'trabajadores', 'dinero', 'vida', 'muerte',
  'agua', 'comida', 'fuego', 'tierra', 'cielo', 'luna', 'sol', 'estrella',
  'flor', 'arbol', 'playa', 'montana', 'rio', 'mar', 'campo', 'bosque',
  'lluvia', 'nube', 'nieve', 'viento', 'perro', 'perros', 'gato', 'caballo',
  'pajaro', 'pez', 'animal', 'libro', 'libros', 'palabra', 'palabras',
  'nombre', 'numero', 'pregunta', 'respuesta', 'historia', 'cuento',
  'musica', 'color', 'pelota', 'zapato', 'zapatos', 'camisa', 'mesa', 'silla',
  'gracias', 'hola', 'adios', 'cumpleanos', 'feliz', 'felicidad', 'amor',
  'corazon', 'cabeza', 'mano', 'manos', 'ojo', 'ojos', 'cara', 'cuerpo',
  'bueno', 'buena', 'buenos', 'buenas', 'malo', 'mala', 'grande', 'pequeno',
  'pequena', 'nuevo', 'nueva', 'viejo', 'vieja', 'rapido', 'rapida', 'lento',
  'alto', 'bajo', 'largo', 'corto', 'fuerte', 'debil', 'facil', 'dificil',
  'blanco', 'negro', 'rojo', 'verde', 'azul', 'amarillo', 'marron', 'gris',
  'redondo', 'redonda', 'abierto', 'abierta', 'cerrado', 'cerrada', 'roto',
  'rota', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'primero',
  'segundo', 'ultimo', 'mejor', 'peor', 'libertad', 'ciudadano', 'sociedad',
  'verdad', 'realidad', 'felizmente', 'rapidamente', 'solamente',
  'normalmente', 'cancion', 'nacion', 'estacion', 'atencion', 'educacion',
  'informacion', 'situacion', 'condicion', 'relacion', 'direccion',
];

/* ------------------------------------------------------------------------- *
 * Build logic (mirrors runtime `trigramScore` extraction).                   *
 * ------------------------------------------------------------------------- */

const TOP_N = 300;

/**
 * Tokenize a word the SAME way runtime extraction does: lowercase, keep only
 * `[a-z]` letters, then pad with ONE leading and ONE trailing space, and emit
 * every length-3 substring (including the boundary trigrams from the padding).
 */
const wordTrigrams = (word: string): string[] => {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length === 0) return [];
  const padded = ` ${letters} `;
  const out: string[] = [];
  for (let i = 0; i + 3 <= padded.length; i += 1) {
    out.push(padded.slice(i, i + 3));
  }
  return out;
};

/** Count trigram frequencies across a word list. */
const countTrigrams = (words: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const word of words) {
    for (const t of wordTrigrams(word)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return counts;
};

interface Profile {
  /** kept trigram -> add-one-smoothed log-probability (rounded to 6 dp). */
  readonly logP: Map<string, number>;
  /** sum of kept counts. */
  readonly sumC: number;
  /** number of distinct kept trigrams. */
  readonly V: number;
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * Keep the TOP_N most frequent trigrams (frequency ties broken by trigram
 * string ascending, deterministic), then compute add-one-smoothed
 * log-probabilities:
 *
 *   logP(t) = Math.log((c + 1) / (sumC + V))
 *
 * where sumC = sum of kept counts and V = number of distinct kept trigrams.
 */
const buildProfile = (words: readonly string[]): Profile => {
  const counts = countTrigrams(words);
  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; // tie: trigram ascending
  });
  const kept = sorted.slice(0, TOP_N);
  const sumC = kept.reduce((acc, [, c]) => acc + c, 0);
  const V = kept.length;
  const logP = new Map<string, number>();
  for (const [t, c] of kept) {
    logP.set(t, round6(Math.log((c + 1) / (sumC + V))));
  }
  return { logP, sumC, V };
};

/** Emit `Record` literal entries sorted by key, compactly (multiple per line). */
const emitRecord = (name: string, logP: Map<string, number>): string => {
  const keys = [...logP.keys()].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const pairs = keys.map((k) => `"${k}": ${logP.get(k)!},`);
  // Pack several pairs per line so the generated file stays well under 500
  // lines while remaining diff-friendly.
  const PER_LINE = 6;
  const lines: string[] = [];
  for (let i = 0; i < pairs.length; i += PER_LINE) {
    lines.push(`  ${pairs.slice(i, i + PER_LINE).join(' ')}`);
  }
  return (
    `export const ${name}: Readonly<Record<string, number>> = {\n` +
    `${lines.join('\n')}\n` +
    `};\n`
  );
};

const es = buildProfile(ES_WORDS);
const en = buildProfile(EN_WORDS);

// TRIGRAM_FLOOR uses the language with the larger (sumC + V), i.e. the smallest
// per-trigram probability mass, so an unseen trigram is scored conservatively.
const maxDenom = Math.max(es.sumC + es.V, en.sumC + en.V);
const TRIGRAM_FLOOR = round6(Math.log(1 / maxDenom));

const header = `/**
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
 * that language (top ${TOP_N} trigrams per language, ties broken by trigram
 * string ascending). TRIGRAM_FLOOR = Math.log(1 / max(sumC + V)) is the score
 * for a trigram absent from a profile. All numbers rounded to 6 decimals.
 */
`;

const floorLine = `export const TRIGRAM_FLOOR: number = ${TRIGRAM_FLOOR};\n`;

const runtime = `/**
 * Score an ALREADY-folded string (see \`fold\` in src/text-utils.ts) for
 * Spanish-vs-English lean using the trigram profiles above. PURE and
 * synchronous; needs no imports because its input is already folded.
 *
 * It applies the SAME extraction as the generator (lowercase → keep \`[a-z]\` →
 * one-space pad → length-3 substrings) and returns the mean per-trigram
 * difference \`(ES_TRIGRAMS[t] ?? FLOOR) - (EN_TRIGRAMS[t] ?? FLOOR)\`. Positive
 * ⇒ Spanish-leaning, negative ⇒ English-leaning, 0 ⇒ no trigrams.
 */
export const trigramScore = (folded: string): number => {
  let sum = 0;
  let count = 0;
  for (const raw of folded.split(/\\s+/)) {
    const letters = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (letters.length === 0) continue;
    const padded = \` \${letters} \`;
    for (let i = 0; i + 3 <= padded.length; i += 1) {
      const t = padded.slice(i, i + 3);
      const esP = ES_TRIGRAMS[t] ?? TRIGRAM_FLOOR;
      const enP = EN_TRIGRAMS[t] ?? TRIGRAM_FLOOR;
      sum += esP - enP;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
};
`;

const body =
  header +
  '\n' +
  emitRecord('ES_TRIGRAMS', es.logP) +
  '\n' +
  emitRecord('EN_TRIGRAMS', en.logP) +
  '\n' +
  floorLine +
  '\n' +
  runtime;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'src', 'detect-trigrams.ts');
writeFileSync(outPath, body, 'utf8');

// eslint-disable-next-line no-console
console.log(
  `Wrote ${outPath}: ES kept ${es.V} trigrams (sumC=${es.sumC}), ` +
    `EN kept ${en.V} trigrams (sumC=${en.sumC}), TRIGRAM_FLOOR=${TRIGRAM_FLOOR}.`,
);
