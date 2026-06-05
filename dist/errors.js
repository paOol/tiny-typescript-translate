/** Base class for every error thrown by tiny-typescript-translate. */
export class TinyTranslateError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = new.target.name;
    }
}
/** Thrown when an unsupported language code is supplied. */
export class UnsupportedLanguageError extends TinyTranslateError {
    value;
    constructor(value) {
        super(`Unsupported language: ${JSON.stringify(value)}. ` +
            `Supported languages are: en, es, zh, ko.`);
        this.value = value;
    }
}
/** Thrown when given empty or otherwise non-analyzable input. */
export class DetectionError extends TinyTranslateError {
}
/**
 * Thrown when a translation backend cannot be used — most commonly because the
 * optional `@huggingface/transformers` peer dependency is not installed.
 */
export class BackendNotAvailableError extends TinyTranslateError {
}
//# sourceMappingURL=errors.js.map