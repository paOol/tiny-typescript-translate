import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Translator, detectLanguage } from '../src/index.js';

/**
 * Real end-to-end translation against the local m2m100 model.
 *
 * This is opt-in because it downloads (~hundreds of MB on first run) and runs a
 * neural model on the CPU. Enable it with:
 *
 *   npm install @huggingface/transformers
 *   TTT_INTEGRATION=1 npm test
 */
const TRANSFORMERS_SPECIFIER = '@huggingface/transformers';
const depAvailable = await import(TRANSFORMERS_SPECIFIER)
  .then(() => true)
  .catch(() => false);

const enabled = depAvailable && !!process.env.TTT_INTEGRATION;

/** Share of the most common character among letters/ideographs (0..1). */
const mostFrequentCharRatio = (text: string): number => {
  const chars = text.match(/[\p{L}]/gu) ?? [];
  if (chars.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of chars) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return Math.max(...counts.values()) / chars.length;
};

describe.skipIf(!enabled)('integration: real translation', () => {
  let translator: Translator;

  beforeAll(async () => {
    translator = new Translator();
    await translator.preload();
  }, 600_000);

  afterAll(async () => {
    await translator?.dispose();
  });

  it('translates English to Chinese without degenerating into repetition', async () => {
    const out = await translator.translate(
      'Good morning, my friend. How are you today?',
      { from: 'en', to: 'zh' },
    );
    expect(out.length).toBeGreaterThan(0);
    expect(detectLanguage(out).language).toBe('zh');
    // The degenerate failure mode was "好,好,好,好,…" — guard against it.
    expect(mostFrequentCharRatio(out)).toBeLessThan(0.5);
  }, 180_000);

  it('translates Chinese to English', async () => {
    const out = await translator.translate('我每天早上都会喝一杯咖啡。', {
      to: 'en',
    });
    expect(detectLanguage(out).language).toBe('en');
    expect(out.toLowerCase()).toContain('coffee');
  }, 180_000);

  it('translates English to Korean', async () => {
    const out = await translator.translate('I really like reading books.', {
      from: 'en',
      to: 'ko',
    });
    expect(detectLanguage(out).language).toBe('ko');
  }, 180_000);

  it('auto-detects the source language', async () => {
    const out = await translator.translate(
      'Me gusta mucho aprender idiomas nuevos.',
      { to: 'en' },
    );
    expect(detectLanguage(out).language).toBe('en');
  }, 180_000);
});
