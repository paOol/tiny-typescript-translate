import { describe, it, expect } from 'vitest';
import { segmentText, stripNonLinguistic } from '../src/non-linguistic.js';

const nonLinguisticSpans = (text: string): string[] =>
  segmentText(text)
    .filter((s) => !s.translatable)
    .map((s) => s.text);

describe('segmentText', () => {
  it('round-trips: segments concatenate back to the exact input', () => {
    const cases = [
      'check this https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O out',
      'mail me at a@b.com, or visit www.example.com.',
      'plain text with no spans at all',
      'https://x.com',
      '(see reddit.com/r/foo)!',
    ];
    for (const text of cases) {
      expect(segmentText(text).map((s) => s.text).join('')).toBe(text);
    }
  });

  it('recognizes scheme URLs, www URLs, bare domains, emails and @handles', () => {
    expect(
      nonLinguisticSpans('https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O'),
    ).toEqual(['https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O']);
    expect(nonLinguisticSpans('go to www.example.com now')).toEqual([
      'www.example.com',
    ]);
    expect(nonLinguisticSpans('reddit.com/r/foo has it')).toEqual([
      'reddit.com/r/foo',
    ]);
    expect(nonLinguisticSpans('mail maria.delgado@correo.es please')).toEqual([
      'maria.delgado@correo.es',
    ]);
    expect(nonLinguisticSpans('thanks @paOol for the link')).toEqual(['@paOol']);
  });

  it('matches a full email rather than its bare-domain suffix', () => {
    const segments = segmentText('a@gmail.com');
    expect(segments).toEqual([{ text: 'a@gmail.com', translatable: false }]);
  });

  it('leaves sentence punctuation hugging a span translatable', () => {
    expect(nonLinguisticSpans('see https://x.com/path.')).toEqual([
      'https://x.com/path',
    ]);
    expect(nonLinguisticSpans('(at reddit.com/r/foo),')).toEqual([
      'reddit.com/r/foo',
    ]);
  });

  it('does not match abbreviations like e.g. or U.S.', () => {
    expect(nonLinguisticSpans('e.g. the U.S. economy, i.e. growth')).toEqual([]);
  });

  it('does not match mid-word or inside an already-matched span', () => {
    // The `b.co` tail of `a.b.co` must not produce a second, nested span.
    expect(nonLinguisticSpans('visit a.b.co today')).toEqual(['a.b.co']);
  });
});

describe('stripNonLinguistic', () => {
  it('replaces spans with a space so neighbors do not fuse', () => {
    expect(stripNonLinguistic('antes https://x.com después')).toBe(
      'antes   después',
    );
  });

  it('returns whitespace only for purely non-linguistic input', () => {
    expect(
      stripNonLinguistic(
        'https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O',
      ).trim(),
    ).toBe('');
  });

  it('is the identity on plain prose', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    expect(stripNonLinguistic(text)).toBe(text);
  });
});
