import type { VocabCard } from '../store/useStore';

/** 无有效标题、无例句或例句全空的词卡，视为空白，可自动移除 */
export function isBlankVocabCard(c: VocabCard): boolean {
  if (!c.headword?.trim()) return true;
  if (!c.items?.length) return true;
  return c.items.every(it => !String(it.sentence ?? '').trim());
}
