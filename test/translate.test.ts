import { describe, it, expect, afterEach } from 'vitest';
import {
  translate,
  Translator,
  setDefaultBackend,
  TransformersBackend,
  BackendNotAvailableError,
  UnsupportedLanguageError,
  type TranslationBackend,
  type Language,
} from '../src/index.js';

/** Records calls and echoes a deterministic, inspectable result. */
class FakeBackend implements TranslationBackend {
  calls: Array<{ text: string; from: Language; to: Language }> = [];
  loaded = false;

  async translate(text: string, from: Language, to: Language): Promise<string> {
    this.calls.push({ text, from, to });
    return `[${from}->${to}] ${text}`;
  }

  async load(): Promise<void> {
    this.loaded = true;
  }
}

afterEach(() => {
  // Undo any global backend overrides between tests.
  setDefaultBackend(null);
});

describe('Translator', () => {
  it('auto-detects the source language by default', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    const out = await translator.translate(
      'The weather is nice today and I am happy.',
      { to: 'es' },
    );

    expect(out).toBe('[en->es] The weather is nice today and I am happy.');
    expect(backend.calls).toEqual([
      {
        text: 'The weather is nice today and I am happy.',
        from: 'en',
        to: 'es',
      },
    ]);
  });

  it('honors an explicit source language', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    const out = await translator.translate('El gato negro', {
      from: 'es',
      to: 'en',
    });

    expect(out).toBe('[es->en] El gato negro');
    expect(backend.calls[0]?.from).toBe('es');
  });

  it('returns the input unchanged when source equals target', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    const out = await translator.translate('Hello there', {
      from: 'en',
      to: 'en',
    });

    expect(out).toBe('Hello there');
    expect(backend.calls).toHaveLength(0);
  });

  it('returns an empty string without invoking the backend', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    expect(await translator.translate('', { to: 'zh' })).toBe('');
    expect(backend.calls).toHaveLength(0);
  });

  it('throws on an unsupported target language', async () => {
    const translator = new Translator({ backend: new FakeBackend() });
    await expect(
      // @ts-expect-error testing runtime validation
      translator.translate('hello', { to: 'fr' }),
    ).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });

  it('throws on an unsupported explicit source language', async () => {
    const translator = new Translator({ backend: new FakeBackend() });
    await expect(
      // @ts-expect-error testing runtime validation
      translator.translate('hello', { from: 'de', to: 'en' }),
    ).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });

  it('preload() delegates to the backend load hook', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });
    await translator.preload();
    expect(backend.loaded).toBe(true);
  });

  it('exposes synchronous detect()', () => {
    const translator = new Translator({ backend: new FakeBackend() });
    expect(translator.detect('Hola, ¿qué tal?').language).toBe('es');
  });
});

describe('non-linguistic content', () => {
  // Regression: this URL was detected as Spanish (via `videos` in the path)
  // and sent to the model, which mangled it.
  it('returns a bare URL unchanged without invoking the backend', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });
    const url = 'https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O';

    expect(await translator.translate(url, { to: 'es' })).toBe(url);
    expect(backend.calls).toHaveLength(0);
  });

  it('returns a bare email address unchanged without invoking the backend', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    expect(await translator.translate('paoolkim@gmail.com', { to: 'es' })).toBe(
      'paoolkim@gmail.com',
    );
    expect(backend.calls).toHaveLength(0);
  });

  it('returns digits/emoji-only input unchanged without invoking the backend', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    expect(await translator.translate('1234 !!! 🎉', { to: 'es' })).toBe(
      '1234 !!! 🎉',
    );
    expect(backend.calls).toHaveLength(0);
  });

  it('passes a URL through verbatim and translates only the prose around it', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });
    const url = 'https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O';

    const out = await translator.translate(`check this out ${url} please`, {
      to: 'es',
    });

    expect(out).toBe(`[en->es] check this out ${url} [en->es] please`);
    expect(backend.calls.map((c) => c.text)).toEqual([
      'check this out',
      'please',
    ]);
  });

  it('passes an email through verbatim inside a sentence', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    const out = await translator.translate('email me at paoolkim@gmail.com today!', {
      from: 'en',
      to: 'es',
    });

    expect(out).toBe('[en->es] email me at paoolkim@gmail.com [en->es] today!');
    expect(backend.calls.map((c) => c.text)).toEqual(['email me at', 'today!']);
  });

  it('makes a single whole-text backend call when no spans are present', async () => {
    const backend = new FakeBackend();
    const translator = new Translator({ backend });

    await translator.translate('The weather is nice today and I am happy.', {
      to: 'es',
    });

    expect(backend.calls.map((c) => c.text)).toEqual([
      'The weather is nice today and I am happy.',
    ]);
  });
});

describe('translate() convenience', () => {
  it('uses the shared default backend', async () => {
    const backend = new FakeBackend();
    setDefaultBackend(backend);

    const out = await translate('请帮我翻译这句话。', { to: 'en' });

    expect(out).toBe('[zh->en] 请帮我翻译这句话。');
    expect(backend.calls[0]?.from).toBe('zh');
  });
});

// Whether the optional translation dependency is installed in this environment.
// A non-literal specifier keeps TypeScript from requiring the optional dep's
// types at compile time, while still resolving at runtime when present.
const TRANSFORMERS_SPECIFIER = '@huggingface/transformers';
const depAvailable = await import(TRANSFORMERS_SPECIFIER)
  .then(() => true)
  .catch(() => false);

describe.skipIf(depAvailable)(
  'TransformersBackend without the optional dependency',
  () => {
    it('throws BackendNotAvailableError when the peer dep is absent', async () => {
      const backend = new TransformersBackend();
      await expect(
        backend.translate('hello', 'en', 'es'),
      ).rejects.toBeInstanceOf(BackendNotAvailableError);
    });
  },
);
