import { describe, it, expect } from 'vitest';
import { fold } from '../src/text-utils.js';
import { trigramScore, TRIGRAM_FLOOR } from '../src/detect-trigrams.js';

describe('detect-trigrams trigramScore', () => {
  it('leans Spanish (positive) on a lexically-bare Spanish fragment', () => {
    expect(trigramScore(fold('marrón rápido'))).toBeGreaterThan(0);
  });

  it('leans English (negative) on a lexically-bare English fragment', () => {
    expect(trigramScore(fold('brown fox'))).toBeLessThan(0);
  });

  it('returns 0 when there are no extractable trigrams', () => {
    expect(trigramScore(fold('1 2 3 -- !!'))).toBe(0);
  });

  it('uses a negative log-probability floor for unseen trigrams', () => {
    expect(TRIGRAM_FLOOR).toBeLessThan(0);
  });
});
