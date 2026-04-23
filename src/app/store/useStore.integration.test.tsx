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

  it('persists corrected sentence updates into error bank state', () => {
    const { result } = renderHook(() => useAppStore(null));

    act(() => {
      result.current.clearAll();
      result.current.addToErrorBank({
        verbId: 'v1',
        verb: 'make',
        collocationId: 'c1',
        collocation: 'make progress',
        originalSentence: 'I make a progress every day.',
        correctedSentence: undefined,
        errorTypes: ['article'],
        errorCategory: 'grammar',
        diagnosis: '1. progress 前不需要冠词。',
        hint: '去掉 a。',
        grammarPoints: ['冠词'],
      });
    });

    const errorId = result.current.errorBank[0]?.id;
    expect(errorId).toBeTruthy();

    act(() => {
      result.current.setErrorBankCorrectedSentence(errorId!, 'I make progress every day.');
    });

    expect(result.current.errorBank).toHaveLength(1);
    expect(result.current.errorBank[0].id).toBe(errorId);
    expect(result.current.errorBank[0].correctedSentence).toBe('I make progress every day.');
  });

  it('deletes stuck point entries from store state', () => {
    const { result } = renderHook(() => useAppStore(null));

    act(() => {
      result.current.clearAll();
      result.current.addStuckPoint({
        chineseThought: '我们不是一路人',
        englishAttempt: '',
        aiSuggestion: '可以说：we are not on the same path',
        recommendedExpression: 'be on the same path',
        sourceMode: 'free',
      });
    });

    const stuckId = result.current.stuckPoints[0]?.id;
    expect(stuckId).toBeTruthy();

    act(() => {
      result.current.deleteStuckPoint(stuckId!);
    });

    expect(result.current.stuckPoints).toHaveLength(0);
  });

  it('reopens resolved error entries', () => {
    const { result } = renderHook(() => useAppStore(null));

    act(() => {
      result.current.clearAll();
      result.current.addToErrorBank({
        verbId: 'v1',
        verb: 'take',
        collocationId: 'c1',
        collocation: 'take notes',
        originalSentence: 'I take note in class.',
        correctedSentence: 'I take notes in class.',
        errorTypes: ['plural'],
        errorCategory: 'grammar',
        diagnosis: 'note 需要复数。',
        hint: '改成 notes。',
        grammarPoints: ['名词单复数'],
      });
    });

    const errorId = result.current.errorBank[0]?.id;
    act(() => {
      result.current.resolveError(errorId!);
      result.current.reopenError(errorId!);
    });

    expect(result.current.errorBank[0].resolved).toBe(false);
    expect(result.current.errorBank[0].reviewStage).toBe(0);
    expect(result.current.errorBank[0].nextReviewAt).toBeTruthy();
  });

  it('updates corpus sentence and clears stale translation', () => {
    const { result } = renderHook(() => useAppStore(null));

    act(() => {
      result.current.clearAll();
      result.current.addToCorpus({
        verbId: 'v1',
        verb: 'make',
        collocationId: 'c1',
        collocation: 'make progress',
        userSentence: 'I make progress every day.',
        isCorrect: true,
        mode: 'test',
        tags: ['make'],
      });
    });

    const entryId = result.current.corpus[0]?.id;
    expect(entryId).toBeTruthy();

    act(() => {
      result.current.setCorpusEntryZhTranslation(entryId!, '我每天都在进步。');
      result.current.updateCorpusEntrySentence(entryId!, 'I am making progress every day.');
    });

    expect(result.current.corpus[0].userSentence).toBe('I am making progress every day.');
    expect(result.current.corpus[0].zhTranslation).toBeUndefined();
  });

  it('reopens resolved stuck points', () => {
    const { result } = renderHook(() => useAppStore(null));

    act(() => {
      result.current.clearAll();
      const entry = result.current.addStuckPoint({
        chineseThought: '我们不是一路人',
        englishAttempt: '',
        aiSuggestion: '可以说：we are not on the same path',
        recommendedExpression: 'be on the same path',
        sourceMode: 'free',
      });
      result.current.resolveStuck(entry.id);
      result.current.reopenStuck(entry.id);
    });

    expect(result.current.stuckPoints[0].resolved).toBe(false);
  });
});
