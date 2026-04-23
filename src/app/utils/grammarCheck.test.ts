import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aiStuckSuggest } = vi.hoisted(() => ({
  aiStuckSuggest: vi.fn(),
}));

vi.mock('./api', () => ({
  aiGrammarCheck: vi.fn(),
  aiChinglishCheck: vi.fn(),
  aiStuckSuggest,
}));

import { getStuckSuggestion } from './grammarCheck';

describe('getStuckSuggestion', () => {
  beforeEach(() => {
    aiStuckSuggest.mockReset();
  });

  it('falls back to generic guidance by default when AI request fails', async () => {
    aiStuckSuggest.mockRejectedValue(new Error('Request failed'));

    const result = await getStuckSuggestion('我们不是一路人', [], []);

    expect(result.type).toBe('paraphrase');
    expect(result.guidanceZh).toContain('先别追求高级词');
    expect(result.examples[0]?.sentence).toBe('I just want to say it in a simpler way.');
  });

  it('throws instead of pretending success when fallback is disabled', async () => {
    aiStuckSuggest.mockRejectedValue(new Error('Request failed'));

    await expect(
      getStuckSuggestion('我们不是一路人', [], [], { allowFallback: false }),
    ).rejects.toThrow('Request failed');
  });
});
