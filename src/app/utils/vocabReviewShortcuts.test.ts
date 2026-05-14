import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage, setAppStorage, webStorage } from '../platform/storage';
import {
  DEFAULT_VOCAB_REVIEW_SHORTCUTS,
  getShortcutLabel,
  loadVocabReviewShortcuts,
  normalizeShortcutKey,
  saveVocabReviewShortcuts,
  setVocabReviewShortcut,
} from './vocabReviewShortcuts';

describe('vocabReviewShortcuts', () => {
  beforeEach(() => {
    memoryStorage.removeItem('ff_vocab_review_shortcuts_v1');
    setAppStorage(memoryStorage);
  });

  afterEach(() => {
    memoryStorage.removeItem('ff_vocab_review_shortcuts_v1');
    setAppStorage(webStorage);
  });

  it('loads default shortcuts when no saved config exists', () => {
    expect(loadVocabReviewShortcuts()).toEqual(DEFAULT_VOCAB_REVIEW_SHORTCUTS);
  });

  it('normalizes printable keys and supported control keys', () => {
    expect(normalizeShortcutKey('a')).toBe('A');
    expect(normalizeShortcutKey(' ')).toBe('Space');
    expect(normalizeShortcutKey('Enter')).toBe('Enter');
    expect(normalizeShortcutKey('Shift')).toBeNull();
  });

  it('clears duplicate shortcuts when assigning a key to another action', () => {
    const next = setVocabReviewShortcut(DEFAULT_VOCAB_REVIEW_SHORTCUTS, 'remembered', '1');

    expect(next).toEqual({
      viewed: null,
      remembered: '1',
      struggled: '3',
    });
  });

  it('persists sanitized shortcuts', () => {
    saveVocabReviewShortcuts({
      viewed: 'a',
      remembered: 'a',
      struggled: 'Enter',
    });

    expect(loadVocabReviewShortcuts()).toEqual({
      viewed: 'A',
      remembered: null,
      struggled: 'Enter',
    });
  });

  it('formats shortcut labels for UI', () => {
    expect(getShortcutLabel('Space')).toBe('空格');
    expect(getShortcutLabel('ArrowLeft')).toBe('←');
    expect(getShortcutLabel(null)).toBe('未设置');
  });
});
