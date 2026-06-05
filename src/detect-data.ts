/**
 * Static frequency data used by the Spanish/English sub-classifier.
 *
 * Chinese and Korean are separated from Latin-script text purely by Unicode
 * script analysis (see `detect.ts`); the only genuinely hard call for these
 * four languages is Spanish vs. English, since they share the Latin alphabet.
 * High-frequency function words ("stopwords") are an extremely cheap and
 * reliable signal for that distinction.
 */

import { fold } from './text-utils.js';

/** Common Spanish function words. */
export const SPANISH_STOPWORDS: ReadonlySet<string> = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'en', 'y', 'o', 'que', 'se', 'no', 'por', 'con', 'para', 'su', 'sus',
  'lo', 'le', 'les', 'me', 'te', 'nos', 'es', 'son', 'era', 'fue', 'ser',
  'estar', 'está', 'están', 'como', 'más', 'pero', 'sí', 'porque', 'esta',
  'este', 'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'entre', 'cuando',
  'muy', 'sin', 'sobre', 'también', 'hasta', 'hay', 'donde', 'quien', 'desde',
  'todo', 'todos', 'toda', 'todas', 'durante', 'ni', 'contra', 'ellos', 'ella',
  'él', 'ante', 'antes', 'algo', 'algunos', 'qué', 'yo', 'tú', 'tu', 'mi',
  'mis', 'nuestro', 'nuestra', 'vez', 'tan', 'ya', 'cada', 'mismo', 'otro',
  'otra', 'otros', 'otras',
]);

/** Common English function words. */
export const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'of', 'and', 'to', 'in', 'is', 'it', 'you', 'that', 'he', 'she',
  'was', 'were', 'for', 'on', 'are', 'as', 'with', 'his', 'her', 'they',
  'at', 'be', 'this', 'have', 'has', 'had', 'from', 'or', 'one', 'by', 'but',
  'not', 'what', 'all', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'an', 'each', 'which', 'do', 'does', 'how', 'their', 'if', 'will', 'up',
  'out', 'about', 'many', 'then', 'them', 'these', 'so', 'some', 'would',
  'into', 'time', 'two', 'more', 'go', 'see', 'no', 'way', 'could', 'people',
  'my', 'than', 'been', 'who', 'now', 'its', 'did', 'get', 'come', 'made',
  'over', 'just', 'because', 'also', 'after', 'where', 'our',
]);

/**
 * Characters that essentially never appear in English but are common in
 * Spanish. Their mere presence is a strong Spanish signal.
 */
export const SPANISH_CHARS: RegExp = /[áéíóúüñ¿¡]/giu;

/**
 * Accent-folded view of {@link SPANISH_STOPWORDS}, used when comparing against
 * tokens that have already been folded (NFD-stripped, lowercased) by
 * {@link fold}. Folding collapses accented forms to their bare ASCII shape
 * (e.g. `más`→`mas`, `qué`→`que`, `él`→`el`, `está`→`esta`, `cómo`→`como`,
 * `también`→`tambien`). A few bare forms are added explicitly so they are
 * present even though only their accented variant appears above.
 */
export const SPANISH_STOPWORDS_FOLDED: ReadonlySet<string> = new Set(
  [
    ...SPANISH_STOPWORDS,
    // Bare/non-accented forms guaranteed regardless of the accented set.
    'mas', 'tu', 'mi', 'si', 'el', 'este', 'esta',
  ].map(fold),
);

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
export const SPANISH_CONTENT_FOLDED: ReadonlySet<string> = new Set([
  'buenos', 'buenas', 'dias', 'gracias', 'amigo', 'amiga', 'amigos', 'amigas',
  'mundo', 'hola', 'manana', 'marron', 'rapido', 'rapida', 'ninos', 'ninas',
  'nino', 'nina', 'senor', 'senora', 'senorita', 'ciudad', 'pais', 'paises',
  'hombre', 'mujer', 'mujeres', 'trabajo', 'tiempo', 'vida', 'agua', 'comida',
  'noche', 'noches', 'tarde', 'casa', 'calle', 'libro', 'libros', 'perro',
  'perros', 'pequeno', 'grande', 'bueno', 'buena', 'feliz', 'cumpleanos',
  'gente', 'dinero', 'hablar', 'comer', 'beber', 'hacer', 'tener', 'querer',
  'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'nuevo', 'nueva', 'viejo',
  'vieja', 'blanco', 'negro', 'rojo', 'verde', 'azul', 'amarillo', 'fuego',
  'tierra', 'cielo', 'luna', 'estrella', 'flor', 'arbol', 'playa', 'montana',
  'camino', 'abierta', 'abierto', 'ventana', 'pelota', 'trabajador',
  'trabajadores',
  // Additional clearly-Spanish content words (folded forms not common English).
  'zapato', 'zapatos', 'caballo', 'pajaro', 'lluvia', 'nube', 'gris', 'puerta',
  'cerrada', 'cerrado', 'redonda', 'redondo', 'camisa', 'roto', 'rota',
  'fuerte', 'escuela', 'familia', 'nombre', 'palabra',
  // Note: `radio`/`video`/`hotel`/`animal`/`real`/`final`/`mango`/`mar` etc.
  // are deliberately omitted — their folded forms are common English words.
]);
