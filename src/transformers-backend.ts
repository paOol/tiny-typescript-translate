import type { Language } from './languages.js';
import type { TranslationBackend } from './backend.js';
import { BackendNotAvailableError, TinyTranslateError } from './errors.js';

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

/** A loaded translation pipeline callable. */
type TranslationPipeline = ((
  text: string,
  options: { src_lang: string; tgt_lang: string } & GenerationOptions,
) => Promise<unknown>) & { dispose?: () => Promise<void> };

const DEFAULT_MODEL = 'Xenova/m2m100_418M';
const DEFAULT_DTYPE: Dtype = 'q8';
const DEFAULT_GENERATION: GenerationOptions = { no_repeat_ngram_size: 3 };

/**
 * Default translation backend. Lazily loads a local neural machine-translation
 * model via the optional `@huggingface/transformers` peer dependency, so simply
 * importing this library (or only using {@link detectLanguage}) costs nothing.
 *
 * The model is downloaded once on first use and then cached on disk; thereafter
 * translation runs fully offline with no servers, API keys or network calls.
 */
export class TransformersBackend implements TranslationBackend {
  readonly model: string;
  readonly dtype: Dtype;
  readonly device: Device | undefined;

  #options: TransformersBackendOptions;
  #generation: GenerationOptions;
  #pipeline: Promise<TranslationPipeline> | null = null;

  constructor(options: TransformersBackendOptions = {}) {
    this.#options = options;
    this.model = options.model ?? DEFAULT_MODEL;
    this.dtype = options.dtype ?? DEFAULT_DTYPE;
    this.device = options.device;
    this.#generation = { ...DEFAULT_GENERATION, ...options.generation };
  }

  /** Download and initialize the model. Safe to call multiple times. */
  async load(): Promise<void> {
    await this.#getPipeline();
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    const pipeline = await this.#getPipeline();
    const output = await pipeline(text, {
      src_lang: from,
      tgt_lang: to,
      ...this.#generation,
    });
    return extractTranslation(output);
  }

  async dispose(): Promise<void> {
    const pending = this.#pipeline;
    this.#pipeline = null;
    if (!pending) return;
    try {
      const pipeline = await pending;
      await pipeline.dispose?.();
    } catch {
      // If the pipeline never loaded, there is nothing to release.
    }
  }

  #getPipeline(): Promise<TranslationPipeline> {
    if (!this.#pipeline) {
      const pending = this.#create();
      // On failure, clear the cache so a later call can retry.
      pending.catch(() => {
        if (this.#pipeline === pending) this.#pipeline = null;
      });
      this.#pipeline = pending;
    }
    return this.#pipeline;
  }

  async #create(): Promise<TranslationPipeline> {
    const transformers = await loadTransformers();

    if (this.#options.cacheDir && transformers.env) {
      transformers.env.cacheDir = this.#options.cacheDir;
    }

    const pipelineOptions: Record<string, unknown> = { dtype: this.dtype };
    if (this.device) pipelineOptions.device = this.device;
    if (this.#options.onProgress) {
      pipelineOptions.progress_callback = this.#options.onProgress;
    }

    const pipeline = await transformers.pipeline(
      'translation',
      this.model,
      pipelineOptions,
    );
    return pipeline as TranslationPipeline;
  }
}

/** The slice of the `@huggingface/transformers` module surface that we use. */
interface TransformersModule {
  pipeline: (task: string, model: string, options?: unknown) => Promise<unknown>;
  env?: { cacheDir?: string; [key: string]: unknown };
}

const loadTransformers = async (): Promise<TransformersModule> => {
  try {
    // Non-literal specifier keeps TypeScript from requiring the optional
    // dependency's types at build time, and the dynamic import keeps it out of
    // memory until translation is actually requested.
    const specifier = '@huggingface/transformers';
    return (await import(specifier)) as TransformersModule;
  } catch (cause) {
    throw new BackendNotAvailableError(
      "The optional peer dependency '@huggingface/transformers' is required for " +
        'translation but is not installed. Install it with:\n\n' +
        '  npm install @huggingface/transformers\n',
      { cause: cause instanceof Error ? cause : undefined },
    );
  }
};

const extractTranslation = (output: unknown): string => {
  const first = Array.isArray(output) ? output[0] : output;
  if (
    first !== null &&
    typeof first === 'object' &&
    'translation_text' in first &&
    typeof (first as { translation_text: unknown }).translation_text === 'string'
  ) {
    return (first as { translation_text: string }).translation_text;
  }
  throw new TinyTranslateError(
    'Unexpected output shape from the translation pipeline.',
  );
};
