import { describe, it, expect } from 'vitest';
import { detectLanguage, DetectionError } from '../src/index.js';
import {
  CORPUS,
  type CorpusEntry,
  type CorpusKind,
} from './fixtures/detect-corpus.js';

describe('detectLanguage', () => {
  it('detects English sentences', () => {
    const cases = [
      'The quick brown fox jumps over the lazy dog.',
      'I would like to learn how to write better code.',
      'This is a simple test of the detection system, and it should work.',
    ];
    for (const text of cases) {
      const result = detectLanguage(text);
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  it('detects Spanish sentences', () => {
    const cases = [
      'El zorro marrón rápido salta sobre el perro perezoso.',
      'Me gustaría aprender a escribir mejor código.',
      'Hola, ¿cómo estás? Espero que todo vaya bien contigo.',
    ];
    for (const text of cases) {
      const result = detectLanguage(text);
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  it('detects Chinese sentences', () => {
    const cases = [
      '敏捷的棕色狐狸跳过了懒狗。',
      '这是一个简单的语言检测测试。',
      '我喜欢在周末读书和喝茶。',
    ];
    for (const text of cases) {
      const result = detectLanguage(text);
      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  it('detects Korean sentences', () => {
    const cases = [
      '빠른 갈색 여우가 게으른 개를 뛰어넘었다.',
      '이것은 간단한 언어 감지 테스트입니다.',
      '저는 주말에 책을 읽고 차를 마시는 것을 좋아합니다.',
    ];
    for (const text of cases) {
      const result = detectLanguage(text);
      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  it('returns normalized scores that sum to ~1', () => {
    const { scores } = detectLanguage('The cat sat on the mat in the house.');
    const sum = scores.en + scores.es + scores.zh + scores.ko;
    expect(sum).toBeCloseTo(1, 6);
    for (const value of Object.values(scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('uses Spanish-specific characters as a strong signal', () => {
    // No function-word matches, but the ñ and ¿/¡ are decisive.
    const result = detectLanguage('¡Mañana! ¿Niños?');
    expect(result.language).toBe('es');
  });

  it('throws on empty or whitespace-only input', () => {
    expect(() => detectLanguage('')).toThrow(DetectionError);
    expect(() => detectLanguage('   \n\t ')).toThrow(DetectionError);
  });

  it('throws on non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => detectLanguage(undefined)).toThrow(DetectionError);
  });

  it('falls back to English with zero confidence when no letters are present', () => {
    const result = detectLanguage('1234 5678 !!! ??? ...');
    expect(result.language).toBe('en');
    expect(result.confidence).toBe(0);
  });
});

describe('non-linguistic spans (URLs, emails, handles)', () => {
  // Regression: this real Reddit URL detected as es @ 1.0 because the `videos`
  // token inside `/r/VideosAmazing` hit the Spanish content-word lexicon.
  it('returns the no-signal result for a bare URL', () => {
    const result = detectLanguage(
      'https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O',
    );
    expect(result.language).toBe('en');
    expect(result.confidence).toBe(0);
  });

  it('returns the no-signal result for a bare email address', () => {
    const result = detectLanguage('maria.delgado@correo.es');
    expect(result.language).toBe('en');
    expect(result.confidence).toBe(0);
  });

  it('ignores a URL when classifying the surrounding English', () => {
    const result = detectLanguage(
      'check out this video https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O',
    );
    expect(result.language).toBe('en');
  });

  it('ignores a URL when classifying the surrounding Spanish', () => {
    const result = detectLanguage(
      'mira este video que me gusta https://www.reddit.com/r/VideosAmazing/s/XSDSHe9J0O',
    );
    expect(result.language).toBe('es');
  });

  it('ignores email addresses and @handles in mixed text', () => {
    expect(
      detectLanguage('escríbeme a maria@correo.es cuando puedas').language,
    ).toBe('es');
    expect(detectLanguage('thanks @ElPerroGato for the link').language).toBe(
      'en',
    );
  });
});

describe('accent-free fragments', () => {
  const KINDS: ReadonlyArray<CorpusKind> = [
    'es-accented',
    'es-accentfree-lexicon',
    'es-accentfree-novel',
    'es-trigram-novel',
    'en-control',
    'es-stripped-sentence',
    'en-slang',
    'en-gaming',
    'en-short-fragment',
  ];

  const entriesOfKind = (kind: CorpusKind): CorpusEntry[] =>
    CORPUS.filter((entry) => entry.kind === kind);

  /**
   * Compute overall + per-kind accuracy of the live detector against the whole
   * corpus. Pure helper shared by the reporter and the hard accuracy gate below.
   */
  const measureCorpus = (): {
    overallCorrect: number;
    perKind: Record<CorpusKind, { correct: number; total: number }>;
  } => {
    let overallCorrect = 0;
    const perKind: Record<CorpusKind, { correct: number; total: number }> = {
      'es-accented': { correct: 0, total: 0 },
      'es-accentfree-lexicon': { correct: 0, total: 0 },
      'es-accentfree-novel': { correct: 0, total: 0 },
      'es-trigram-novel': { correct: 0, total: 0 },
      'en-control': { correct: 0, total: 0 },
      'es-stripped-sentence': { correct: 0, total: 0 },
      'en-slang': { correct: 0, total: 0 },
      'en-gaming': { correct: 0, total: 0 },
      'en-short-fragment': { correct: 0, total: 0 },
    };

    for (const entry of CORPUS) {
      const detected = detectLanguage(entry.text).language;
      perKind[entry.kind].total += 1;
      if (detected === entry.expected) {
        perKind[entry.kind].correct += 1;
        overallCorrect += 1;
      }
    }
    return { overallCorrect, perKind };
  };

  const pct = (correct: number, total: number): string =>
    total === 0 ? 'n/a' : `${((correct / total) * 100).toFixed(1)}%`;

  /**
   * Reporter: logs the current detector's accuracy on the whole corpus, overall
   * and broken down per kind (now including `es-trigram-novel`). Purely
   * informational — the pass/fail gate lives in the next test.
   */
  it('reports accuracy overall and per kind', () => {
    const { overallCorrect, perKind } = measureCorpus();

    const lines: string[] = [];
    lines.push('[detect corpus] overall ' +
      `${overallCorrect}/${CORPUS.length} (${pct(overallCorrect, CORPUS.length)})`);
    for (const kind of KINDS) {
      const { correct, total } = perKind[kind];
      lines.push(`[detect corpus]   ${kind}: ` +
        `${correct}/${total} (${pct(correct, total)})`);
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));

    expect(true).toBe(true);
  });

  /**
   * The release gate (the plan's success metric). Three HARD assertions:
   *   1. Overall corpus accuracy ≥ 0.95.
   *   2. ZERO English→Spanish flips: every `en-control` entry detects English.
   *      This is the non-negotiable regression gate.
   *   3. `es-trigram-novel` per-kind accuracy ≥ 0.8 — a threshold (not 100%)
   *      that honestly documents the flat-margin recall floor on genuinely
   *      out-of-lexicon Spanish fragments decided purely by trigrams.
   */
  it('meets the corpus-accuracy gate with zero en→es flips', () => {
    const { overallCorrect, perKind } = measureCorpus();

    // 1. Overall accuracy ≥ 0.95.
    const overall = overallCorrect / CORPUS.length;
    expect(overall).toBeGreaterThanOrEqual(0.95);

    // 2. Zero English→Spanish flips on the en-control subset.
    const en = perKind['en-control'];
    expect(en.total).toBeGreaterThan(0);
    expect(en.correct).toBe(en.total);

    // 3. es-trigram-novel per-kind accuracy ≥ 0.8 (documented recall floor).
    const novel = perKind['es-trigram-novel'];
    expect(novel.total).toBeGreaterThan(0);
    expect(novel.correct / novel.total).toBeGreaterThanOrEqual(0.8);
  });

  // --- Assertions that already hold today ----------------------------------

  it('detects every en-control fragment as English', () => {
    for (const entry of entriesOfKind('en-control')) {
      expect(detectLanguage(entry.text).language).toBe('en');
    }
  });

  it('detects every es-accented fragment as Spanish', () => {
    for (const entry of entriesOfKind('es-accented')) {
      expect(detectLanguage(entry.text).language).toBe('es');
    }
  });

  // The stripped full sentences still carry enough Spanish function words to be
  // detected correctly today, so this is a passing assertion (not it.fails).
  it('detects every es-stripped-sentence as Spanish', () => {
    for (const entry of entriesOfKind('es-stripped-sentence')) {
      expect(detectLanguage(entry.text).language).toBe('es');
    }
  });

  // --- Known-red: documented with it.fails so CI stays green while broken ---
  // Each body loops the whole kind; because at least one (in fact every) entry
  // is currently misdetected, the body throws, which is exactly what it.fails
  // requires to count as a pass. Later tasks flip these to normal it(...).

  // Phase 1 (folded function + content lexicon) fixes these: accent-free
  // common-Spanish-word fragments now detect as Spanish.
  it('detects every es-accentfree-lexicon fragment as Spanish', () => {
    for (const entry of entriesOfKind('es-accentfree-lexicon')) {
      expect(detectLanguage(entry.text).language).toBe('es');
    }
  });

  // NOTE: although Phase 2 (trigrams) is the general fix for novel Spanish
  // words, every current es-accentfree-novel corpus entry is already covered by
  // the Phase-1 content lexicon, so they all detect as Spanish today.
  it('detects every es-accentfree-novel fragment as Spanish', () => {
    for (const entry of entriesOfKind('es-accentfree-novel')) {
      expect(detectLanguage(entry.text).language).toBe('es');
    }
  });

  // The es-trigram-novel kind has ZERO lexical evidence and is decided purely
  // by the trigram tiebreak. We assert via a THRESHOLD (≥ 0.8), not 100%, to
  // honestly reflect the documented flat-margin recall floor — see the
  // corpus-accuracy gate above for the enforced numeric bound.
  it('detects at least 80% of es-trigram-novel fragments as Spanish', () => {
    const entries = entriesOfKind('es-trigram-novel');
    expect(entries.length).toBeGreaterThan(0);
    const correct = entries.filter(
      (entry) => detectLanguage(entry.text).language === 'es',
    ).length;
    expect(correct / entries.length).toBeGreaterThanOrEqual(0.8);
  });
});

describe('confidence semantics', () => {
  // A trigram-only decision is a WEAK signal, so its confidence must stay in a
  // modest band — distinguishable from a strong, lexically-rich full sentence.
  it('gives a trigram-only Spanish fragment modest confidence', () => {
    // 'jarra llena' carries zero lexical evidence (no accents, no function or
    // content-word hits) and is decided purely by trigrams (≈ +1.32).
    const result = detectLanguage('jarra llena');
    expect(result.language).toBe('es');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThan(0.85);
  });

  // An accent-rich / function-word-rich Spanish sentence is a STRONG signal:
  // it is decided by the normalized lexical split, not the trigram squash.
  it('gives a function-word-rich Spanish sentence high confidence', () => {
    const result = detectLanguage(
      'Hola, ¿cómo estás? Espero que todo vaya bien contigo.',
    );
    expect(result.language).toBe('es');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  // The scores-sum-to-~1 invariant must still hold for a trigram-only call.
  it('keeps scores summing to ~1 for a trigram-only call', () => {
    const { scores } = detectLanguage('jarra llena');
    const sum = scores.en + scores.es + scores.zh + scores.ko;
    expect(sum).toBeCloseTo(1, 6);
  });

  // The "no letters" path is unaffected: confidence stays exactly 0.
  it('keeps zero confidence when no letters are present', () => {
    const result = detectLanguage('1234 5678 !!! ??? ...');
    expect(result.confidence).toBe(0);
  });
});

describe('trigram tiebreak', () => {
  // Regression gate: wiring the trigram tiebreak into the zero-evidence branch
  // must NOT flip any English control fragment to Spanish.
  it('keeps every en-control fragment detecting English', () => {
    for (const entry of CORPUS.filter((e) => e.kind === 'en-control')) {
      expect(detectLanguage(entry.text).language).toBe('en');
    }
  });

  // The trigram path proper: GENUINELY out-of-lexicon Spanish fragments — none
  // of these words appear in SPANISH_CONTENT_FOLDED / SPANISH_STOPWORDS_FOLDED,
  // so they carry zero lexical evidence and can only be decided by trigrams.
  // (Verified: each scores trigramScore(fold(text)) well above TRIGRAM_MARGIN.)
  it('decides out-of-lexicon Spanish fragments via trigrams', () => {
    const fragments = [
      'jarra llena', // trigramScore ≈ 1.25
      'cazadora cansada', // ≈ 0.86
      'maceta rajada', // ≈ 0.78
    ];
    for (const text of fragments) {
      expect(detectLanguage(text).language).toBe('es');
    }
  });
});

describe('English↔Spanish homograph stopwords', () => {
  // Regression for "Stop messaging me." → es @ 1.0. `me` (and `a`) are everyday
  // English words that are ALSO Spanish stopwords. Before they were listed on
  // the English side too, such a word was the ONLY lexical hit in a short
  // English sentence and forced a full-confidence Spanish call. Now neutralized,
  // these fall through to the trigram tiebreak and correctly read English.
  it('detects short English sentences whose only stopword is a homograph', () => {
    const cases = [
      'Stop messaging me.',
      'Send me a message',
      'Give me a break',
      'Send a message',
      'Call me later',
      'text me',
    ];
    for (const text of cases) {
      expect(detectLanguage(text).language, `"${text}"`).toBe('en');
    }
  });

  // The neutralization must NOT cost any genuine Spanish: real Spanish sentences
  // carry other Spanish evidence beyond the homograph, so they stay Spanish.
  it('still detects Spanish sentences containing the homographs', () => {
    const cases = [
      'Me gustaría aprender a escribir mejor código.',
      'Dame un poco de agua, por favor.',
      'Llámame mañana por la tarde.',
    ];
    for (const text of cases) {
      expect(detectLanguage(text).language, `"${text}"`).toBe('es');
    }
  });
});

describe('slang false-positive guard', () => {
  const SLANG_KINDS = ['en-slang', 'en-gaming', 'en-short-fragment'] as const;

  const slangEntries = CORPUS.filter((e) =>
    (SLANG_KINDS as readonly string[]).includes(e.kind),
  );

  // The hard gate: ZERO English→Spanish flips on any internet-slang, gaming, or
  // short-common-English fragment. Each is the exact failure the guard targets.
  it('detects every slang / gaming / short-fragment entry as English', () => {
    expect(slangEntries.length).toBeGreaterThanOrEqual(30);
    const flips = slangEntries.filter(
      (e) => detectLanguage(e.text).language !== 'en',
    );
    expect(
      flips.map((f) => f.text),
      `English→Spanish flips on slang: ${flips.map((f) => f.text).join(', ')}`,
    ).toEqual([]);
  });

  // The exact terms that flipped to Spanish in the pre-guard probe. They cover
  // both failure mechanisms: the trigram tiebreak (`imo`, `vibe`, `side quest`…)
  // and a Spanish-stopword collision (`sus`, `no cap`, `sus imposter`).
  it('fixes every former false positive from the baseline probe', () => {
    const formerFalsePositives = [
      'imo', 'periodt', 'nocap', 'sus', 'vibe', 'vibes', 'ez', 'ggez',
      'gg ez', 'camp', 'meta', 'bro', 'no cap', 'side quest', 'sus imposter',
    ];
    for (const text of formerFalsePositives) {
      expect(detectLanguage(text).language, `"${text}"`).toBe('en');
    }
  });

  // `sus` is the only entry that previously scored a full es=1.0 via a Spanish
  // stopword; the decisive English colloquial weight must dominate it.
  it('overrides the Spanish "sus" stopword with the colloquial signal', () => {
    const r = detectLanguage('sus');
    expect(r.language).toBe('en');
    expect(r.scores.en).toBeGreaterThan(r.scores.es);
  });

  // Guard must NOT touch genuine out-of-lexicon Spanish (≥10 letters, no k/w):
  // the es-trigram-novel path still flips to Spanish.
  it('still detects genuine out-of-lexicon Spanish fragments as Spanish', () => {
    for (const text of ['jarra llena', 'carretera estrecha', 'naranja madura']) {
      expect(detectLanguage(text).language, `"${text}"`).toBe('es');
    }
  });
});
