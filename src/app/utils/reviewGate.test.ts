import { describe, expect, it } from 'vitest';
import {
  buildClozeParts,
  verifyClozeBlank,
  sentenceContainsCollocation,
  isTooSimilarToReference,
  pickCollocationForCloze,
  levenshteinSimilarity,
} from './reviewGate';

describe('reviewGate', () => {
  it('buildClozeParts finds phrase case-insensitively', () => {
    const parts = buildClozeParts('I get up early.', 'get up');
    expect(parts).toEqual({ before: 'I ', after: ' early.' });
  });

  it('verifyClozeBlank ignores case', () => {
    expect(verifyClozeBlank('GET UP', 'get up')).toBe(true);
    expect(verifyClozeBlank('get', 'get up')).toBe(false);
  });

  it('sentenceContainsCollocation', () => {
    expect(sentenceContainsCollocation('I get up early', 'get up')).toBe(true);
    expect(sentenceContainsCollocation('I wake early', 'get up')).toBe(false);
  });

  it('isTooSimilarToReference flags near-copy', () => {
    const orig = 'I have been working on this for years.';
    expect(isTooSimilarToReference(orig, orig, 0.88)).toBe(true);
    expect(isTooSimilarToReference('Totally different words here every day.', orig, 0.88)).toBe(false);
  });

  it('levenshteinSimilarity', () => {
    expect(levenshteinSimilarity('abc', 'abc')).toBe(1);
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('pickCollocationForCloze picks first match in sentence', () => {
    expect(pickCollocationForCloze('I get up now.', ['focus on', 'get up'])).toBe('get up');
    expect(pickCollocationForCloze('No match', ['a', 'b'])).toBe('a');
  });
});
