/**
 * tiny-typescript-translate
 *
 * Zero-infrastructure, low-memory language detection and translation for
 * headless Node.js. Supports English, Spanish, Chinese and Korean.
 */
export { LANGUAGES, LANGUAGE_NAMES, isSupportedLanguage, } from './languages.js';
export { detectLanguage } from './detect.js';
export { translate, Translator, getDefaultBackend, setDefaultBackend, } from './translate.js';
export { TransformersBackend, } from './transformers-backend.js';
export { TinyTranslateError, UnsupportedLanguageError, DetectionError, BackendNotAvailableError, } from './errors.js';
//# sourceMappingURL=index.js.map