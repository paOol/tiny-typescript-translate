import { detectLanguage } from './detect.js';
import { isSupportedLanguage } from './languages.js';
import { UnsupportedLanguageError } from './errors.js';
import { TransformersBackend, } from './transformers-backend.js';
let sharedBackend = null;
/**
 * Get the process-wide default backend, creating it on first use. Shared so the
 * (memory-heavy) translation model is loaded at most once per process.
 */
export const getDefaultBackend = () => {
    if (!sharedBackend)
        sharedBackend = new TransformersBackend();
    return sharedBackend;
};
/**
 * Replace (or clear, with `null`) the process-wide default backend. Mostly
 * useful for tests or to apply global model configuration.
 */
export const setDefaultBackend = (backend) => {
    sharedBackend = backend;
};
const resolveSource = (from, text) => {
    const value = from ?? 'auto';
    if (value === 'auto')
        return detectLanguage(text).language;
    if (isSupportedLanguage(value))
        return value;
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
    #backend;
    #modelOptions;
    constructor(options = {}) {
        this.#backend = options.backend ?? null;
        this.#modelOptions = options.model;
    }
    /** Detect the language of `text`. Synchronous and offline. */
    detect(text) {
        return detectLanguage(text);
    }
    /**
     * Translate `text` into `options.to`. The source language is detected
     * automatically unless `options.from` is given. If the resolved source and
     * target are the same, the input is returned unchanged.
     *
     * @throws {@link UnsupportedLanguageError} for an unsupported `to`/`from`.
     */
    async translate(text, options) {
        if (!isSupportedLanguage(options.to)) {
            throw new UnsupportedLanguageError(options.to);
        }
        if (text.length === 0)
            return '';
        const from = resolveSource(options.from, text);
        if (from === options.to)
            return text;
        return this.#getBackend().translate(text, from, options.to);
    }
    /**
     * Eagerly load the backend's model so the first {@link translate} call is
     * fast. The language hints are advisory; the default model ignores them.
     */
    async preload(from, to) {
        const backend = this.#getBackend();
        if (backend.load) {
            await backend.load(from, to);
        }
        else if (from && to && from !== to) {
            await backend.translate(' ', from, to);
        }
    }
    /** Release backend resources, if the backend supports it. */
    async dispose() {
        await this.#backend?.dispose?.();
    }
    #getBackend() {
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
export const translate = (text, options) => new Translator().translate(text, options);
//# sourceMappingURL=translate.js.map