import { describe, it, expect } from 'vitest';
import {
  ENGLISH_STOPWORDS,
  ENGLISH_COLLOQUIAL_FOLDED,
  SPANISH_STOPWORDS_FOLDED,
  SPANISH_CONTENT_FOLDED,
} from '../src/detect-data.js';

/**
 * Words that look like Spanish content but whose folded form collides with a
 * common English word. Kept in sync with the denylist documented in
 * `src/detect-data.ts`; none of these may appear in SPANISH_CONTENT_FOLDED.
 */
const ENGLISH_COLLISION_DENYLIST: readonly string[] = [
  'real', 'son', 'as', 'me', 'fin', 'red', 'pan', 'mango', 'sol', 'mesa',
  'gato', 'rio', 'van', 'ten', 'come', 'paso', 'gana', 'mar', 'ser', 'ir',
  'vista', 'mas', 'animal', 'error', 'doctor', 'hotel', 'total', 'final',
  'normal', 'central', 'idea', 'area', 'radio', 'video', 'hospital',
];

describe('detect-data folded sets', () => {
  it('keeps SPANISH_CONTENT_FOLDED clear of English stopwords', () => {
    for (const word of SPANISH_CONTENT_FOLDED) {
      expect(ENGLISH_STOPWORDS.has(word), `"${word}" is an English stopword`).toBe(false);
    }
  });

  it('keeps SPANISH_CONTENT_FOLDED clear of the English-collision denylist', () => {
    const denylist = new Set(ENGLISH_COLLISION_DENYLIST);
    for (const word of SPANISH_CONTENT_FOLDED) {
      expect(denylist.has(word), `"${word}" is on the English-collision denylist`).toBe(false);
    }
  });

  it('stores all content words in folded (ASCII, lowercase) form', () => {
    for (const word of SPANISH_CONTENT_FOLDED) {
      expect(word).toMatch(/^[a-z]+$/);
    }
  });

  it('reaches bare folded function-word forms in SPANISH_STOPWORDS_FOLDED', () => {
    expect(SPANISH_STOPWORDS_FOLDED.has('mas')).toBe(true);
    expect(SPANISH_STOPWORDS_FOLDED.has('esta')).toBe(true);
    expect(SPANISH_STOPWORDS_FOLDED.has('que')).toBe(true);
  });
});

describe('ENGLISH_COLLOQUIAL_FOLDED curation', () => {
  // The single intentional overlap with a Spanish stopword: bare `sus` is
  // overwhelmingly English/gaming slang; Spanish `sus` never stands alone.
  const ALLOWED_SPANISH_OVERLAP = new Set(['sus']);

  it('stores every entry in folded (ASCII, lowercase) form', () => {
    for (const word of ENGLISH_COLLOQUIAL_FOLDED) {
      expect(word, `"${word}" is not folded ASCII`).toMatch(/^[a-z]+$/);
    }
  });

  it('never collides with a Spanish CONTENT word (would turn Spanish English)', () => {
    for (const word of ENGLISH_COLLOQUIAL_FOLDED) {
      expect(
        SPANISH_CONTENT_FOLDED.has(word),
        `"${word}" is also a Spanish content word`,
      ).toBe(false);
    }
  });

  it('overlaps Spanish STOPWORDS only on the documented exception (sus)', () => {
    for (const word of ENGLISH_COLLOQUIAL_FOLDED) {
      if (SPANISH_STOPWORDS_FOLDED.has(word)) {
        expect(
          ALLOWED_SPANISH_OVERLAP.has(word),
          `"${word}" is a Spanish stopword and not a documented exception`,
        ).toBe(true);
      }
    }
  });

  it('contains the expected slang / gaming / fragment members', () => {
    for (const word of ['gg', 'ez', 'imo', 'sus', 'vibe', 'side', 'quest']) {
      expect(ENGLISH_COLLOQUIAL_FOLDED.has(word), `missing "${word}"`).toBe(true);
    }
  });
});
