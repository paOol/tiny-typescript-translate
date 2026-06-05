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
export const SPANISH_STOPWORDS = new Set([
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
export const ENGLISH_STOPWORDS = new Set([
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
export const SPANISH_CHARS = /[áéíóúüñ¿¡]/giu;
/**
 * Accent-folded view of {@link SPANISH_STOPWORDS}, used when comparing against
 * tokens that have already been folded (NFD-stripped, lowercased) by
 * {@link fold}. Folding collapses accented forms to their bare ASCII shape
 * (e.g. `más`→`mas`, `qué`→`que`, `él`→`el`, `está`→`esta`, `cómo`→`como`,
 * `también`→`tambien`). A few bare forms are added explicitly so they are
 * present even though only their accented variant appears above.
 */
export const SPANISH_STOPWORDS_FOLDED = new Set([
    ...SPANISH_STOPWORDS,
    // Bare/non-accented forms guaranteed regardless of the accented set.
    'mas', 'tu', 'mi', 'si', 'el', 'este', 'esta',
].map(fold));
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
export const SPANISH_CONTENT_FOLDED = new Set([
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
export const ENGLISH_COLLOQUIAL_FOLDED = new Set([
    // chat / text abbreviations
    'lol', 'lmao', 'rofl', 'lmfao', 'omg', 'wtf', 'brb', 'afk', 'irl', 'imo',
    'imho', 'tbh', 'ngl', 'idk', 'idc', 'smh', 'fyi', 'btw', 'ttyl', 'gtg',
    'nvm', 'wyd', 'hbu', 'ily', 'jk', 'np', 'ty', 'thx', 'pls', 'plz', 'rn',
    'fr', 'ong', 'istg', 'fomo', 'yolo', 'lmk', 'iykyk', 'ikr', 'wbu',
    // reaction / descriptor slang
    'deadass', 'periodt', 'lowkey', 'highkey', 'bet', 'cap', 'nocap', 'based',
    'cringe', 'sus', 'simp', 'stan', 'salty', 'savage', 'ghosted', 'flex',
    'vibe', 'vibes', 'mood', 'slay', 'bussin', 'mid', 'rizz', 'sigma', 'npc',
    'cope', 'seethe', 'mald', 'kek', 'pog', 'poggers', 'pogchamp', 'sheesh',
    'yikes', 'bruh', 'bro', 'fam', 'homie', 'bestie', 'goated', 'goat', 'dub',
    'yeet', 'yoink', 'oof', 'drip', 'banger', 'slaps', 'cracked', 'gigachad',
    // gaming terms
    'ez', 'gg', 'ggwp', 'ggez', 'noob', 'pwned', 'owned', 'rekt', 'clutch',
    'smurf', 'tryhard', 'sweaty', 'sweat', 'gamer', 'frag', 'respawn', 'buff',
    'nerf', 'op', 'aggro', 'gank', 'headshot', 'whiff', 'hardstuck', 'boosted',
    'inting', 'feeding', 'diff', 'washed', 'ranked', 'unranked', 'lobby',
    'queue', 'lag', 'ping', 'copium', 'hopium', 'eco', 'wp',
    // short ordinary-English words the stopword list omits (NOT Spanish-colliding)
    'side', 'quest', 'talk',
]);
//# sourceMappingURL=detect-data.js.map