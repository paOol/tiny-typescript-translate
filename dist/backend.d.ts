import type { Language } from './languages.js';
/**
 * A pluggable translation engine.
 *
 * The library ships with {@link TransformersBackend} (local, offline, powered
 * by `@huggingface/transformers`), but any object implementing this interface
 * can be supplied to a {@link Translator} — useful for testing, for swapping in
 * a different model, or for routing to a custom engine.
 */
export interface TranslationBackend {
    /**
     * Translate `text` from one supported language to another. Implementations
     * may assume `from !== to` and that both are valid {@link Language} codes.
     */
    translate(text: string, from: Language, to: Language): Promise<string>;
    /**
     * Optionally warm up the backend (e.g. download and initialize a model) so
     * the first {@link translate} call is fast. May ignore the language hints.
     */
    load?(from?: Language, to?: Language): Promise<void>;
    /** Optionally release any held resources (model sessions, memory…). */
    dispose?(): Promise<void>;
}
//# sourceMappingURL=backend.d.ts.map