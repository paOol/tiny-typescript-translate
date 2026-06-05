/** Base class for every error thrown by tiny-typescript-translate. */
export declare class TinyTranslateError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
/** Thrown when an unsupported language code is supplied. */
export declare class UnsupportedLanguageError extends TinyTranslateError {
    readonly value: unknown;
    constructor(value: unknown);
}
/** Thrown when given empty or otherwise non-analyzable input. */
export declare class DetectionError extends TinyTranslateError {
}
/**
 * Thrown when a translation backend cannot be used — most commonly because the
 * optional `@huggingface/transformers` peer dependency is not installed.
 */
export declare class BackendNotAvailableError extends TinyTranslateError {
}
//# sourceMappingURL=errors.d.ts.map