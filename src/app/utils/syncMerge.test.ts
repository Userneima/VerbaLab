import { describe, expect, it } from 'vitest';
import {
  mergeByIdNewerTimestamp,
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
