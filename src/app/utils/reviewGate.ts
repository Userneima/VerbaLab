/** 复习再产出：本地校验、搭配包含、与原句相似度（防照抄） */

export function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 在句子中查找短语（不区分大小写），返回原文字段中的起止下标 */
export function findPhraseInSentence(
  sentence: string,
  phrase: string
): { start: number; end: number; matched: string } | null {
  const normPhrase = phrase.trim();
  if (!normPhrase || !sentence) return null;
  const re = new RegExp(escapeRegex(normPhrase), 'i');
  const m = sentence.match(re);
  if (!m || m.index === undefined) return null;
  return { start: m.index, end: m.index + m[0].length, matched: m[0] };
}

export function buildClozeParts(
  sentence: string,
  phrase: string
): { before: string; after: string } | null {
  const found = findPhraseInSentence(sentence, phrase);
  if (!found) return null;
  return {
    before: sentence.slice(0, found.start),
    after: sentence.slice(found.end),
  };
}

/** 填空：用户只填挖空处，需与目标搭配一致（忽略大小写与首尾空白） */
export function verifyClozeBlank(userBlank: string, expectedPhrase: string): boolean {
  return normalizeForMatch(userBlank) === normalizeForMatch(expectedPhrase);
}

/** 整句是否包含目标搭配（归一化后子串） */
export function sentenceContainsCollocation(sentence: string, collocation: string): boolean {
  const a = normalizeForMatch(sentence);
  const b = normalizeForMatch(collocation);
  if (!b) return false;
  return a.includes(b);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

/** 归一化后 Levenshtein 相似度 0..1，1 表示完全相同 */
export function levenshteinSimilarity(a: string, b: string): number {
  const s = normalizeForMatch(a);
  const t = normalizeForMatch(b);
  if (!s.length && !t.length) return 1;
  const dist = levenshtein(s, t);
  const maxLen = Math.max(s.length, t.length);
  return 1 - dist / maxLen;
}

/**
 * 是否与错题原句过高相似（照抄）。
 * @param minSimilarity 高于此值则视为未换述，建议 0.88~0.92
 */
export function isTooSimilarToReference(
  userSentence: string,
  reference: string,
  minSimilarity = 0.9
): boolean {
  if (!normalizeForMatch(reference)) return false;
  return levenshteinSimilarity(userSentence, reference) >= minSimilarity;
}

/** 词卡：从若干搭配中选第一个能在句中出现的作为挖空目标 */
export function pickCollocationForCloze(sentence: string, collocations: string[]): string | null {
  for (const c of collocations) {
    if (findPhraseInSentence(sentence, c)) return c;
  }
  return collocations[0] ?? null;
}
