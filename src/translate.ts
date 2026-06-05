import { detectLanguage, type DetectionResult } from './detect.js';
import { isSupportedLanguage, type Language } from './languages.js';
import { UnsupportedLanguageError } from './errors.js';
import type { TranslationBackend } from './backend.js';
import {
  TransformersBackend,
  type TransformersBackendOptions,
} from './transformers-backend.js';

/** Options for {@link translate} and {@link Translator.translate}. */
export interface TranslateOptions {
  /** Target language. Required. */
  to: Language;
  /**
   * Source language, or `'auto'` to detect it from the text. Defaults to
   * `'auto'`.
   */
  from?: Language | 'auto';
}

/** Options for constructing a {@link Translator}. */
export interface TranslatorOptions {
  /**
   * A custom {@link TranslationBackend}. When omitted, a lazily-initialized
   * {@link TransformersBackend} is used.
   */
  backend?: TranslationBackend;
  /**
   * Options for the default {@link TransformersBackend}. Ignored when a custom
   * `backend` is supplied.
   */
  model?: TransformersBackendOptions;
}

let sharedBackend: TranslationBackend | null = null;

/**
 * Get the process-wide default backend, creating it on first use. Shared so the
 * (memory-heavy) translation model is loaded at most once per process.
 */
export const getDefaultBackend = (): TranslationBackend => {
  if (!sharedBackend) sharedBackend = new TransformersBackend();
  return sharedBackend;
};

/**
 * Replace (or clear, with `null`) the process-wide default backend. Mostly
 * useful for tests or to apply global model configuration.
 */
export const setDefaultBackend = (backend: TranslationBackend | null): void => {
  sharedBackend = backend;
};

const resolveSource = (
  from: Language | 'auto' | undefined,
  text: string,
): Language => {
  const value = from ?? 'auto';
  if (value === 'auto') return detectLanguage(text).language;
  if (isSupportedLanguage(value)) return value;
  throw new UnsupportedLanguageError(value);
};

/**
 * A reusable translator that pairs offline language detection with a
 * translation backend.
 *
 * Construct one and reuse it so the underlying model is loaded a single time.
 *
 * @example
 * ```ts
 * const translator = new Translator();
 * await translator.translate('Hello, world!', { to: 'es' });
 * // → '¡Hola, mundo!'
 * ```
 */
export class Translator {
  #backend: TranslationBackend | null;
  #modelOptions: TransformersBackendOptions | undefined;

  constructor(options: TranslatorOptions = {}) {
    this.#backend = options.backend ?? null;
    this.#modelOptions = options.model;
  }

  /** Detect the language of `text`. Synchronous and offline. */
  detect(text: string): DetectionResult {
    return detectLanguage(text);
  }

  /**
   * Translate `text` into `options.to`. The source language is detected
   * automatically unless `options.from` is given. If the resolved source and
   * target are the same, the input is returned unchanged.
   *
   * @throws {@link UnsupportedLanguageError} for an unsupported `to`/`from`.
   */
  async translate(text: string, options: TranslateOptions): Promise<string> {
    if (!isSupportedLanguage(options.to)) {
      throw new UnsupportedLanguageError(options.to);
    }
    if (text.length === 0) return '';

    const from = resolveSource(options.from, text);
    if (from === options.to) return text;

    return this.#getBackend().translate(text, from, options.to);
  }

  /**
   * Eagerly load the backend's model so the first {@link translate} call is
   * fast. The language hints are advisory; the default model ignores them.
   */
  async preload(from?: Language, to?: Language): Promise<void> {
    const backend = this.#getBackend();
    if (backend.load) {
      await backend.load(from, to);
    } else if (from && to && from !== to) {
      await backend.translate(' ', from, to);
    }
  }

  /** Release backend resources, if the backend supports it. */
  async dispose(): Promise<void> {
    await this.#backend?.dispose?.();
  }

  #getBackend(): TranslationBackend {
    if (!this.#backend) {
      this.#backend = this.#modelOptions
        ? new TransformersBackend(this.#modelOptions)
        : getDefaultBackend();
    }
    return this.#backend;
  }
}

/**
 * One-shot translation convenience. Detects the source language (unless
 * `options.from` is provided) and translates `text` into `options.to` using the
 * shared default backend.
 *
 * For repeated calls, prefer constructing a {@link Translator} once and reusing
 * it.
 *
 * @example
 * ```ts
 * await translate('请把这句话翻译成英文。', { to: 'en' });
 * ```
 */
export const translate = (
  text: string,
  options: TranslateOptions,
): Promise<string> => new Translator().translate(text, options);
