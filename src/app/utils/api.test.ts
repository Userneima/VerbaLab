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
});

