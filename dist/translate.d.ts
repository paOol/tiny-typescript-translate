import { type DetectionResult } from './detect.js';
import { type Language } from './languages.js';
import type { TranslationBackend } from './backend.js';
import { type TransformersBackendOptions } from './transformers-backend.js';
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
/**
 * Get the process-wide default backend, creating it on first use. Shared so the
 * (memory-heavy) translation model is loaded at most once per process.
 */
export declare const getDefaultBackend: () => TranslationBackend;
/**
 * Replace (or clear, with `null`) the process-wide default backend. Mostly
 * useful for tests or to apply global model configuration.
 */
export declare const setDefaultBackend: (backend: TranslationBackend | null) => void;
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
export declare class Translator {
    #private;
    constructor(options?: TranslatorOptions);
    /** Detect the language of `text`. Synchronous and offline. */
    detect(text: string): DetectionResult;
    /**
     * Translate `text` into `options.to`. The source language is detected
     * automatically unless `options.from` is given. If the resolved source and
     * target are the same, the input is returned unchanged.
     *
     * @throws {@link UnsupportedLanguageError} for an unsupported `to`/`from`.
     */
    translate(text: string, options: TranslateOptions): Promise<string>;
    /**
     * Eagerly load the backend's model so the first {@link translate} call is
     * fast. The language hints are advisory; the default model ignores them.
     */
    preload(from?: Language, to?: Language): Promise<void>;
    /** Release backend resources, if the backend supports it. */
    dispose(): Promise<void>;
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
export declare const translate: (text: string, options: TranslateOptions) => Promise<string>;
//# sourceMappingURL=translate.d.ts.map