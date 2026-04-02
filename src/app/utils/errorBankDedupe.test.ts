import { describe, expect, it } from 'vitest';
import { normalizeErrorSentenceForDedupe } from './errorBankDedupe';

describe('normalizeErrorSentenceForDedupe', () => {
  it('collapses space and case', () => {
    expect(normalizeErrorSentenceForDedupe('  Hello  WORLD.  ')).toBe('hello world');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeErrorSentenceForDedupe('Same sentence!!!')).toBe('same sentence');
  });

  it('treats typographic apostrophe like straight', () => {
    expect(normalizeErrorSentenceForDedupe("I'm")).toBe("i'm");
  });
});
