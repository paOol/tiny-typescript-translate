import type { Language } from './languages.js';
import type { TranslationBackend } from './backend.js';
/** Quantization / precision options accepted by `@huggingface/transformers`. */
export type Dtype = 'fp32' | 'fp16' | 'q8' | 'int8' | 'uint8' | 'q4' | 'q4f16' | 'bnb4';
/** Execution device accepted by `@huggingface/transformers`. */
export type Device = 'cpu' | 'wasm' | 'gpu' | 'cuda' | 'dml' | 'webgpu';
/**
 * Text-generation parameters forwarded to the model on every translation.
 *
 * The default `no_repeat_ngram_size: 3` is important: without it, m2m100 can
 * degenerate into repetition loops for some target languages (notably Chinese).
 */
export interface GenerationOptions {
    /** Hard cap on generated tokens. */
    max_new_tokens?: number;
    /** Hard cap on total sequence length. */
    max_length?: number;
    /** Beam-search width. `1` (default) is greedy and uses the least memory. */
    num_beams?: number;
    /** Forbid repeating any n-gram of this size. Defaults to `3`. */
    no_repeat_ngram_size?: number;
    /** Penalty (>1) applied to already-generated tokens. */
    repetition_penalty?: number;
    [key: string]: unknown;
}
/** Configuration for {@link TransformersBackend}. */
export interface TransformersBackendOptions {
    /**
     * Model id on the Hugging Face Hub. Defaults to `'Xenova/m2m100_418M'`, a
     * single multilingual model that translates directly between all four
     * supported languages.
     */
    model?: string;
    /**
     * Weight precision. Defaults to `'q8'` (8-bit quantized) for low memory use.
     * Use `'fp32'` for maximum quality at the cost of memory and speed.
     */
    dtype?: Dtype;
    /** Execution device. Defaults to the library's automatic choice (CPU in Node). */
    device?: Device;
    /** Directory used to cache downloaded model files. */
    cacheDir?: string;
    /** Callback invoked with model download/initialization progress events. */
    onProgress?: (progress: unknown) => void;
    /** Generation parameters applied to every translation. Merged over the defaults. */
    generation?: GenerationOptions;
}
/**
 * Default translation backend. Lazily loads a local neural machine-translation
 * model via the optional `@huggingface/transformers` peer dependency, so simply
 * importing this library (or only using {@link detectLanguage}) costs nothing.
 *
 * The model is downloaded once on first use and then cached on disk; thereafter
 * translation runs fully offline with no servers, API keys or network calls.
 */
export declare class TransformersBackend implements TranslationBackend {
    #private;
    readonly model: string;
    readonly dtype: Dtype;
    readonly device: Device | undefined;
    constructor(options?: TransformersBackendOptions);
    /** Download and initialize the model. Safe to call multiple times. */
    load(): Promise<void>;
    translate(text: string, from: Language, to: Language): Promise<string>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=transformers-backend.d.ts.map