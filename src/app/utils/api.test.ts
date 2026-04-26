import { describe, expect, it } from 'vitest';
import { __apiTestables } from './api';

describe('api sync parsing', () => {
  it('fills defaults when incremental payload omits datasets', () => {
    const parsed = __apiTestables.parseSyncLoadResult({
      learnedCollocations: ['a', 'b'],
      serverTimestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.corpus).toEqual([]);
    expect(parsed.errorBank).toEqual([]);
    expect(parsed.stuckPoints).toEqual([]);
    expect(parsed.vocabCards).toEqual([]);
    expect(parsed.learnedCollocations).toEqual(['a', 'b']);
    expect(parsed.serverTimestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('normalizes structured stuck suggestion payloads', () => {
    const parsed = __apiTestables.parseStuckSuggestResult({
      type: 'verb',
      suggestion: '先用更简单的核心动词来表达。',
      guidanceZh: '优先说清动作，再补细节。',
      examples: [
        {
          sentence: 'I want to explain it in a simpler way.',
          chinese: '我想用更简单的方式把它说清楚。',
          noteZh: '适合先开口。',
        },
      ],
    });

    expect(parsed.type).toBe('verb');
    expect(parsed.guidanceZh).toBe('优先说清动作，再补细节。');
    expect(parsed.examples[0].sentence).toBe('I want to explain it in a simpler way.');
  });

  it('parses invite inventory payloads with optional nullable fields', () => {
    const parsed = __apiTestables.parseInviteListResult({
      invites: [
        {
          id: '1',
          code: 'VERBA-ABCD-EFGH-JKLM',
          note: null,
          batch_note: null,
          assigned_to: 'Alice',
          assigned_at: '2026-04-26T08:00:00.000Z',
          used_by: 'user-1',
          used_by_email: 'alice@example.com',
          created_at: '2026-04-26T00:00:00.000Z',
          used_at: null,
        },
      ],
      totalAvailable: 0,
      totalAssigned: 1,
      totalUnused: 1,
      totalUsed: 2,
    });

    expect(parsed.invites[0].code).toBe('VERBA-ABCD-EFGH-JKLM');
    expect(parsed.invites[0].assigned_to).toBe('Alice');
    expect(parsed.invites[0].used_by_email).toBe('alice@example.com');
    expect(parsed.invites[0].used_at).toBeNull();
    expect(parsed.totalAssigned).toBe(1);
    expect(parsed.totalUnused).toBe(1);
    expect(parsed.totalUsed).toBe(2);
  });
});
