import { describe, expect, it } from 'vitest';
import { IELTS_QUESTIONS } from '../data/verbData';
import { buildFieldDifficultyAssist } from './fieldDifficultyAssist';

describe('buildFieldDifficultyAssist', () => {
  it('returns usable assist content for every built-in IELTS question', () => {
    for (const question of IELTS_QUESTIONS) {
      const assist = buildFieldDifficultyAssist(question);
      expect(assist.outlineZh.length).toBeGreaterThanOrEqual(3);
      expect(assist.sentenceStems.length).toBeGreaterThanOrEqual(3);
      expect(assist.keySentence.trim().length).toBeGreaterThan(10);
      expect(assist.keySentenceZh.trim().length).toBeGreaterThan(4);
    }
  });

  it('falls back gracefully for unknown questions', () => {
    const assist = buildFieldDifficultyAssist({
      id: 'UNKNOWN',
      part: 3,
      topic: 'Society',
      question: 'What do you think about public responsibility?',
    });

    expect(assist.outlineZh[0]).toContain('先');
    expect(assist.sentenceStems[0]).toContain('I think');
    expect(assist.keySentence).toContain('real life');
  });
});
