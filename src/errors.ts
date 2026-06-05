/** Base class for every error thrown by tiny-typescript-translate. */
export class TinyTranslateError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when an unsupported language code is supplied. */
export class UnsupportedLanguageError extends TinyTranslateError {
  constructor(public readonly value: unknown) {
    super(
      `Unsupported language: ${JSON.stringify(value)}. ` +
        `Supported languages are: en, es, zh, ko.`,
    );
  }
}

/** Thrown when given empty or otherwise non-analyzable input. */
export class DetectionError extends TinyTranslateError {}

/**
 * Thrown when a translation backend cannot be used — most commonly because the
 * optional `@huggingface/transformers` peer dependency is not installed.
 */
export class BackendNotAvailableError extends TinyTranslateError {}
