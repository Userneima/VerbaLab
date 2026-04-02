import { normalizeSentenceForDedupe } from './sentenceDedupe';

/**
 * 合并「同一搭配 + 实质同一句」的重复提交（实验室多次点提交检查）。
 */
export function normalizeErrorSentenceForDedupe(sentence: string): string {
  return normalizeSentenceForDedupe(sentence);
}
