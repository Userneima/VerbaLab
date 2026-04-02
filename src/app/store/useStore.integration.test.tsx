import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from './useStore';

describe('useAppStore integration', () => {
  it('dedupes corpus entries by normalized key', () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => {
      result.current.clearAll();
      result.current.addToCorpus({
        verbId: 'v1',
        verb: 'do',
        collocationId: 'c1',
        collocation: 'do well',
        userSentence: 'I do well in class.',
        isCorrect: true,
        mode: 'test',
        tags: ['do'],
      });
      result.current.addToCorpus({
        verbId: 'v1',
        verb: 'do',
        collocationId: 'c1',
        collocation: 'do well',
        userSentence: 'i do well in class',
        isCorrect: true,
        mode: 'field',
        tags: ['well'],
      });
    });
    expect(result.current.corpus).toHaveLength(1);
    expect(result.current.corpus[0].tags.sort()).toEqual(['do', 'well']);
  });
});

