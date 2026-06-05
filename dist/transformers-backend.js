import { BackendNotAvailableError, TinyTranslateError } from './errors.js';
const DEFAULT_MODEL = 'Xenova/m2m100_418M';
const DEFAULT_DTYPE = 'q8';
const DEFAULT_GENERATION = { no_repeat_ngram_size: 3 };
/**
 * Default translation backend. Lazily loads a local neural machine-translation
 * model via the optional `@huggingface/transformers` peer dependency, so simply
 * importing this library (or only using {@link detectLanguage}) costs nothing.
 *
 * The model is downloaded once on first use and then cached on disk; thereafter
 * translation runs fully offline with no servers, API keys or network calls.
 */
export class TransformersBackend {
    model;
    dtype;
    device;
    #options;
    #generation;
    #pipeline = null;
    constructor(options = {}) {
        this.#options = options;
        this.model = options.model ?? DEFAULT_MODEL;
        this.dtype = options.dtype ?? DEFAULT_DTYPE;
        this.device = options.device;
        this.#generation = { ...DEFAULT_GENERATION, ...options.generation };
    }
    /** Download and initialize the model. Safe to call multiple times. */
    async load() {
        await this.#getPipeline();
    }
    async translate(text, from, to) {
        const pipeline = await this.#getPipeline();
        const output = await pipeline(text, {
            src_lang: from,
            tgt_lang: to,
            ...this.#generation,
        });
        return extractTranslation(output);
    }
    async dispose() {
        const pending = this.#pipeline;
        this.#pipeline = null;
        if (!pending)
            return;
        try {
            const pipeline = await pending;
            await pipeline.dispose?.();
        }
        catch {
            // If the pipeline never loaded, there is nothing to release.
        }
    }
    #getPipeline() {
        if (!this.#pipeline) {
            const pending = this.#create();
            // On failure, clear the cache so a later call can retry.
            pending.catch(() => {
                if (this.#pipeline === pending)
                    this.#pipeline = null;
            });
            this.#pipeline = pending;
        }
        return this.#pipeline;
    }
    async #create() {
        const transformers = await loadTransformers();
        if (this.#options.cacheDir && transformers.env) {
            transformers.env.cacheDir = this.#options.cacheDir;
        }
        const pipelineOptions = { dtype: this.dtype };
        if (this.device)
            pipelineOptions.device = this.device;
        if (this.#options.onProgress) {
            pipelineOptions.progress_callback = this.#options.onProgress;
        }
        const pipeline = await transformers.pipeline('translation', this.model, pipelineOptions);
        return pipeline;
    }
}
const loadTransformers = async () => {
    try {
        // Non-literal specifier keeps TypeScript from requiring the optional
        // dependency's types at build time, and the dynamic import keeps it out of
        // memory until translation is actually requested.
        const specifier = '@huggingface/transformers';
        return (await import(specifier));
    }
    catch (cause) {
        throw new BackendNotAvailableError("The optional peer dependency '@huggingface/transformers' is required for " +
            'translation but is not installed. Install it with:\n\n' +
            '  npm install @huggingface/transformers\n', { cause: cause instanceof Error ? cause : undefined });
    }
};
const extractTranslation = (output) => {
    const first = Array.isArray(output) ? output[0] : output;
    if (first !== null &&
        typeof first === 'object' &&
        'translation_text' in first &&
        typeof first.translation_text === 'string') {
        return first.translation_text;
    }
    throw new TinyTranslateError('Unexpected output shape from the translation pipeline.');
};
//# sourceMappingURL=transformers-backend.js.map