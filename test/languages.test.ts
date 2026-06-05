import { describe, it, expect } from 'vitest';
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  isSupportedLanguage,
} from '../src/index.js';

describe('language metadata', () => {
  it('exposes exactly the four supported languages', () => {
    expect([...LANGUAGES]).toEqual(['en', 'es', 'zh', 'ko']);
  });

  it('has a human-readable name for every language', () => {
    for (const lang of LANGUAGES) {
      expect(typeof LANGUAGE_NAMES[lang]).toBe('string');
      expect(LANGUAGE_NAMES[lang].length).toBeGreaterThan(0);
    }
  });

  it('recognizes supported codes and rejects others', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('ko')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(false);
    expect(isSupportedLanguage('')).toBe(false);
    expect(isSupportedLanguage(42)).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });
});
