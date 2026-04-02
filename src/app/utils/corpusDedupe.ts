import { normalizeSentenceForDedupe } from './sentenceDedupe';

/** 同一搭配 id + 规范化后的句子 → 可比对是否重复 */
export function corpusSentenceDedupeKey(collocationId: string, userSentence: string): string {
  return `${collocationId}\0${normalizeSentenceForDedupe(userSentence)}`;
}

/** 每条语料 id → 与其「同搭配 + 同句」的条数（含自身） */
export function corpusDuplicateGroupSizes(
  entries: { id: string; collocationId: string; userSentence: string }[]
): Map<string, number> {
  const keyToCount = new Map<string, number>();
  for (const e of entries) {
    const k = corpusSentenceDedupeKey(e.collocationId, e.userSentence);
    keyToCount.set(k, (keyToCount.get(k) || 0) + 1);
  }
  const idToSize = new Map<string, number>();
  for (const e of entries) {
    const k = corpusSentenceDedupeKey(e.collocationId, e.userSentence);
    idToSize.set(e.id, keyToCount.get(k) || 1);
  }
  return idToSize;
}

/** 有几组「同搭配 + 同句」出现多次；redundantEntryCount = 若每组只保留 1 条可删去的条数之和 */
export function getCorpusDuplicateSummary(
  entries: { collocationId: string; userSentence: string }[]
): { duplicateGroupCount: number; redundantEntryCount: number } {
  const keyToCount = new Map<string, number>();
  for (const e of entries) {
    const k = corpusSentenceDedupeKey(e.collocationId, e.userSentence);
    keyToCount.set(k, (keyToCount.get(k) || 0) + 1);
  }
  let duplicateGroupCount = 0;
  let redundantEntryCount = 0;
  for (const n of keyToCount.values()) {
    if (n > 1) {
      duplicateGroupCount += 1;
      redundantEntryCount += n - 1;
    }
  }
  return { duplicateGroupCount, redundantEntryCount };
}

