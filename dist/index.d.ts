/**
 * tiny-typescript-translate
 *
 * Zero-infrastructure, low-memory language detection and translation for
 * headless Node.js. Supports English, Spanish, Chinese and Korean.
 */
export { LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage, type Language, } from './languages.js';
export { detectLanguage, type DetectionResult } from './detect.js';
export { translate, Translator, getDefaultBackend, setDefaultBackend, type TranslateOptions, type TranslatorOptions, } from './translate.js';
export type { TranslationBackend } from './backend.js';
export { TransformersBackend, type TransformersBackendOptions, type GenerationOptions, type Dtype, type Device, } from './transformers-backend.js';
export { TinyTranslateError, UnsupportedLanguageError, DetectionError, BackendNotAvailableError, } from './errors.js';
//# sourceMappingURL=index.d.ts.map