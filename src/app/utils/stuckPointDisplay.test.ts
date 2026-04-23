import { describe, expect, it } from 'vitest';
import { extractTitleEnglishFromAiSuggestion, getStuckPointDisplay } from './stuckPointDisplay';

describe('stuckPointDisplay', () => {
  it('extracts unquoted English example sentences from AI guidance', () => {
    const title = extractTitleEnglishFromAiSuggestion(
      '你可以直接说：I got the offer at the end of the interview.\n例句：I got the offer at the end of the interview.'
    );

    expect(title).toBe('I got the offer at the end of the interview.');
  });

  it('prefers AI expression instead of user attempt for guided stuck entries', () => {
    const display = getStuckPointDisplay({
      id: 's1',
      timestamp: '2026-04-23T00:00:00.000Z',
      chineseThought: '获得录用通知',
      englishAttempt: 'I do well at the last interview. And get the. A quiet notice meant.',
      aiSuggestion: '可以直接说：I got the offer at the end of the interview.',
      resolved: false,
      sourceMode: 'field',
      contextCollocation: 'do well',
    });

    expect(display.titleEnglish).toBe('I got the offer at the end of the interview.');
  });
});
