import { describe, expect, it } from 'vitest';
import {
  corpusDuplicateGroupSizes,
  corpusSentenceDedupeKey,
  getCorpusDuplicateSummary,
} from './corpusDedupe';

describe('corpusSentenceDedupeKey', () => {
  it('treats same collocation and normalized sentence as same key', () => {
    const k1 = corpusSentenceDedupeKey('c1', 'Hello world.');
    const k2 = corpusSentenceDedupeKey('c1', '  hello WORLD  ');
    expect(k1).toBe(k2);
  });

  it('separates by collocation id', () => {
    const k1 = corpusSentenceDedupeKey('c1', 'Same text');
    const k2 = corpusSentenceDedupeKey('c2', 'Same text');
    expect(k1).not.toBe(k2);
  });
});

describe('corpusDuplicateGroupSizes', () => {
  it('counts group size per entry id', () => {
    const entries = [
      { id: 'a', collocationId: 'x', userSentence: 'One.' },
      { id: 'b', collocationId: 'x', userSentence: 'one' },
      { id: 'c', collocationId: 'x', userSentence: 'Two.' },
    ];
    const m = corpusDuplicateGroupSizes(entries);
    expect(m.get('a')).toBe(2);
    expect(m.get('b')).toBe(2);
    expect(m.get('c')).toBe(1);
  });
});

describe('getCorpusDuplicateSummary', () => {
  it('returns groups and redundant count', () => {
    const entries = [
      { collocationId: 'x', userSentence: 'A' },
      { collocationId: 'x', userSentence: 'a.' },
      { collocationId: 'x', userSentence: 'B' },
    ];
    expect(getCorpusDuplicateSummary(entries)).toEqual({
      duplicateGroupCount: 1,
      redundantEntryCount: 1,
    });
  });
});
