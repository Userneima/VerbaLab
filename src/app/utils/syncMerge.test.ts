import { describe, expect, it } from 'vitest';
import {
  mergeByIdNewerTimestamp,
  mergeVocabCards,
  mergeLearnedCollocationIds,
  mergeFoundryExampleOverrides,
} from './syncMerge';

describe('mergeByIdNewerTimestamp', () => {
  it('keeps newer timestamp for same id', () => {
    const local = [{ id: 'a', timestamp: '2024-01-01T00:00:00.000Z', v: 1 }];
    const remote = [{ id: 'a', timestamp: '2024-02-01T00:00:00.000Z', v: 2 }];
    const out = mergeByIdNewerTimestamp(local, remote);
    expect(out).toHaveLength(1);
    expect(out[0].v).toBe(2);
  });

  it('union of ids from both sides', () => {
    const local = [{ id: 'a', timestamp: '2024-01-02T00:00:00.000Z' }];
    const remote = [{ id: 'b', timestamp: '2024-01-01T00:00:00.000Z' }];
    const out = mergeByIdNewerTimestamp(local, remote);
    expect(out.map(x => x.id).sort()).toEqual(['a', 'b']);
  });
});

describe('mergeLearnedCollocationIds', () => {
  it('unions remote into local set', () => {
    const s = new Set(['a']);
    const out = mergeLearnedCollocationIds(s, ['b', 'a']);
    expect([...out].sort()).toEqual(['a', 'b']);
  });
});

describe('mergeVocabCards', () => {
  it('keeps fresher review state even when timestamp is older', () => {
    type TestCard = {
      id: string;
      timestamp: string;
      headword: string;
      reviewStage: number;
      lastViewedAt: string | null;
      nextDueAt: string;
    };
    const local: TestCard[] = [{
      id: 'vc-1',
      timestamp: '2024-04-10T00:00:00.000Z',
      headword: 'abode',
      reviewStage: 1,
      lastViewedAt: '2024-04-15T00:00:00.000Z',
      nextDueAt: '2024-04-22T00:00:00.000Z',
    }];
    const remote: TestCard[] = [{
      id: 'vc-1',
      timestamp: '2024-04-12T00:00:00.000Z',
      headword: 'abode',
      reviewStage: 0,
      lastViewedAt: null,
      nextDueAt: '2024-04-13T00:00:00.000Z',
    }];
    const out = mergeVocabCards<TestCard>(local, remote);
    expect(out).toHaveLength(1);
    expect(out[0].reviewStage).toBe(1);
    expect(out[0].nextDueAt).toBe('2024-04-22T00:00:00.000Z');
    expect(out[0].lastViewedAt).toBe('2024-04-15T00:00:00.000Z');
    expect(out[0].timestamp).toBe('2024-04-15T00:00:00.000Z');
  });

  it('still keeps newer content fields by timestamp', () => {
    type TestCard = {
      id: string;
      timestamp: string;
      headword: string;
      reviewStage: number;
      lastViewedAt: string | null;
      nextDueAt: string;
    };
    const local: TestCard[] = [{
      id: 'vc-1',
      timestamp: '2024-04-10T00:00:00.000Z',
      headword: 'old-word',
      reviewStage: 1,
      lastViewedAt: '2024-04-15T00:00:00.000Z',
      nextDueAt: '2024-04-22T00:00:00.000Z',
    }];
    const remote: TestCard[] = [{
      id: 'vc-1',
      timestamp: '2024-04-16T00:00:00.000Z',
      headword: 'new-word',
      reviewStage: 0,
      lastViewedAt: null,
      nextDueAt: '2024-04-13T00:00:00.000Z',
    }];
    const out = mergeVocabCards<TestCard>(local, remote);
    expect(out[0].headword).toBe('new-word');
    expect(out[0].reviewStage).toBe(1);
    expect(out[0].nextDueAt).toBe('2024-04-22T00:00:00.000Z');
  });
});

describe('mergeFoundryExampleOverrides', () => {
  it('picks newer updatedAt per collocation id', () => {
    const local = {
      c1: { items: [{ content: 'A' }], updatedAt: '2024-02-01T00:00:00.000Z' },
    };
    const remote = {
      c1: { items: [{ content: 'B' }], updatedAt: '2024-01-01T00:00:00.000Z' },
      c2: { items: [{ content: 'C' }], updatedAt: '2024-01-01T00:00:00.000Z' },
    };
    const out = mergeFoundryExampleOverrides(local, remote);
    expect(out.c1.items[0].content).toBe('A');
    expect(out.c2.items[0].content).toBe('C');
  });
});
