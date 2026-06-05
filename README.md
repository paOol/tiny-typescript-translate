# tiny-typescript-translate

Offline language **detection** + **translation** for Node.js — no servers, no API keys, no runtime network calls.

Supports **English** (`en`), **Spanish** (`es`), **Chinese** (`zh`), **Korean** (`ko`).

- 🔍 **Detect** — fully offline, synchronous, zero dependencies.
- 🌐 **Translate** — any direction, via a local neural model (optional).
- 📦 **Tiny** — detection adds no deps; the model loads lazily only if you translate.

---

## Install

```bash
npm install tiny-typescript-translate
```

Detection works out of the box. **Translation** needs one optional peer dependency:

```bash
npm install @huggingface/transformers
```

> On first translation the model (`Xenova/m2m100_418M`, a few hundred MB) downloads from the Hugging Face Hub and is cached on disk. Every call after that runs **offline**.

---

## Usage

### Detect a language

```ts
import { detectLanguage } from 'tiny-typescript-translate';

detectLanguage('The quick brown fox').language; // 'en'
detectLanguage('El zorro marrón rápido').language; // 'es'
detectLanguage('敏捷的棕色狐狸').language; // 'zh'
detectLanguage('빠른 갈색 여우').language; // 'ko'
```

### Translate (source auto-detected)

```ts
import { translate } from 'tiny-typescript-translate';

await translate('Me gusta aprender idiomas.', { to: 'en' });
// → 'I like to learn languages.'
```

### Reuse a translator (loads the model once)

```ts
import { Translator } from 'tiny-typescript-translate';

const translator = new Translator();
await translator.translate('Good morning, my friend.', {
  from: 'en',
  to: 'ko'
});
// → '안녕하세요 친구.'
```

---

## API

### `detectLanguage(text): DetectionResult`

Synchronous, offline. Throws `DetectionError` on empty/non-string input.

```ts
interface DetectionResult {
  language: Language; // 'en' | 'es' | 'zh' | 'ko'
  confidence: number; // 0..1
  scores: Record<Language, number>; // normalized, sum ≈ 1
}
```

Most accurate on a full sentence; also handles short **accent-free** Spanish (e.g. `buenos dias`). See [How detection works](#how-detection-works).

### `translate(text, options): Promise<string>`

One-shot helper using a shared default backend.

```ts
interface TranslateOptions {
  to: Language; // required
  from?: Language | 'auto'; // default 'auto' (detect)
}
```

| Case                       | Behavior                          |
| -------------------------- | --------------------------------- |
| `from` omitted / `'auto'`  | source is detected from `text`    |
| resolved source === target | input returned unchanged          |
| empty input                | returns `''` (model never loads)  |
| unknown language code      | throws `UnsupportedLanguageError` |

For repeated calls, prefer a `Translator` (loads the model once).

### `class Translator`

```ts
const translator = new Translator(options?);

translator.detect(text);              // DetectionResult (sync, offline)
translator.translate(text, options);  // Promise<string>
translator.preload(from?, to?);       // Promise<void> — warm up the model
translator.dispose();                 // Promise<void> — release resources
```

```ts
interface TranslatorOptions {
  backend?: TranslationBackend; // custom engine (see below)
  model?: TransformersBackendOptions; // tune the default engine
}
```

### Configure the model — `TransformersBackendOptions`

```ts
new Translator({
  model: {
    model: 'Xenova/m2m100_418M', // any compatible Hub model id
    dtype: 'q8', // 'fp32' | 'fp16' | 'q8' | 'q4' (default 'q8')
    device: 'cpu', // default: auto (CPU in Node)
    cacheDir: './.models', // where weights are cached
    onProgress: (p) => console.log(p),
    generation: { no_repeat_ngram_size: 3 } // generation params
  }
});
```

- **`dtype`** — quality/memory trade-off. `'q8'` (default) keeps memory low; `'fp32'` is best quality; `'q4'` is smallest.
- **`generation.no_repeat_ngram_size`** — defaults to `3`. Prevents repetition loops on some target languages; override only if you know what you're doing.

### Custom backends — `TranslationBackend`

The engine is pluggable — swap models, route elsewhere, or stub translation in tests:

```ts
import { Translator, type TranslationBackend } from 'tiny-typescript-translate';

const upperCaseBackend: TranslationBackend = {
  async translate(text, from, to) {
    return `[${from}->${to}] ${text.toUpperCase()}`;
  }
};

const translator = new Translator({ backend: upperCaseBackend });
```

Set a process-wide default with `setDefaultBackend(backend)` / read it with `getDefaultBackend()`.

### Constants & helpers

```ts
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  isSupportedLanguage
} from 'tiny-typescript-translate';

LANGUAGES; // readonly ['en', 'es', 'zh', 'ko']
LANGUAGE_NAMES.ko; // 'Korean'
isSupportedLanguage('en'); // true
isSupportedLanguage('fr'); // false
```

### Errors

All extend `TinyTranslateError`:

| Error                      | Thrown when                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `DetectionError`           | empty or non-string input to `detectLanguage`                         |
| `UnsupportedLanguageError` | a language code outside `en` / `es` / `zh` / `ko`                     |
| `BackendNotAvailableError` | translation requested but `@huggingface/transformers` isn't installed |

---

## Requirements

- Node.js **>= 18**
- ESM only (`"type": "module"`)

## Testing

```bash
npm test                  # fast, offline unit tests (no model needed)
npm run test:integration  # real translation; requires @huggingface/transformers
```

The integration suite is opt-in: it runs only when `TTT_INTEGRATION=1` **and** `@huggingface/transformers` is installed (otherwise skipped).

---

## About

Tiny, **zero-infrastructure** language detection and translation for headless Node.js. Everything runs locally — no servers, no API keys, no runtime network calls — for a deliberately focused set of four languages.

| Code | Language |
| ---- | -------- |
| `en` | English  |
| `es` | Spanish  |
| `zh` | Chinese  |
| `ko` | Korean   |

**Memory & performance**

- Importing the library, or using **only** `detectLanguage`, loads **no** model and adds **no** runtime dependencies. Detection ships a few KB of static data (a folded Spanish content lexicon + two ~300-entry character-trigram profiles) — a deliberate accuracy-first trade-off for short, accent-free Spanish. Still small, just no longer data-free.
- The translation model loads **lazily** on the first `translate()` call and is shared across the process, so it uses memory only when actually translating.
- `Xenova/m2m100_418M` is a single multilingual model covering all four languages in every direction — no per-pair models, no pivoting.
- Call `translator.dispose()` when finished to release the model session.

### How detection works

- **Chinese** and **Korean** are identified by Unicode script (Han / Hangul).
- **Spanish vs. English** (which share the Latin alphabet) use a layered, fully offline pipeline:
  1. **Spanish-specific characters** (`ñ`, `¿`, `¡`, accented vowels), read on the raw text before any folding.
  2. **Accent-folded function words** — folding (Unicode `NFD`, strip diacritics, lowercase, `ñ → n`) means an accent-stripped Spanish sentence still matches its stopwords.
  3. A folded **content-word lexicon** of high-frequency Spanish words, curated to avoid common-English collisions — catches short fragments like `buenos dias` or `gracias amigo`.
  4. A **character-trigram tiebreak** (Cavnar–Trenkle style), used only when there's no lexical evidence or an exact tie — classifies novel accent-free Spanish like `carretera estrecha`. English stays the default on a genuine tie.
  5. An **English colloquial lexicon** (internet slang, gaming terms, chat abbreviations) plus a short-fragment guard, so English chat text like `sus`, `no cap`, `gg ez`, `vibe` or `side quest` isn't misread as Spanish. The guard only restricts the Spanish-flip direction (a trigram-only fragment must be ≥ 8 letters and free of `k`/`w` to be called Spanish), so it can't regress genuine English.

Trigram-only fragment calls carry a deliberately modest `confidence` (~0.55–0.8), distinguishing them from lexically-clear, high-confidence sentences. A one- or two-word fragment of words in no list and with a weak trigram signal may still fall back to English.

## License

[MIT](./LICENSE)
