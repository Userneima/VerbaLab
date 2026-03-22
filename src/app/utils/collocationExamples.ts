import type { ExampleSentence } from '../data/verbData';

/** 去掉口语里用来凑字的套话前缀，便于判断「是否同一句换皮」 */
const DISCLOSURE_PREFIXES: RegExp[] = [
  /^in my daily life,?\s+/i,
  /^from my perspective,?\s+/i,
  /^actually,?\s+/i,
  /^personally,?\s+/i,
  /^honestly,?\s+/i,
  /^to be honest,?\s+/i,
];

export function normalizeExampleCore(content: string): string {
  let t = content.trim();
  for (const re of DISCLOSURE_PREFIXES) {
    t = t.replace(re, '');
  }
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** 词袋签名：仅调换从句/短语顺序时，排序后的词序列相同 → 判为重复 */
function sortedTokenSignature(core: string): string {
  const words = core
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  return [...words].sort().join(' ');
}

/** 与已有核心句相比是否「换皮重复」（同核、子串包含、或同词袋仅换序） */
function isRedundantCore(core: string, seenCores: string[], seenSigs: string[]): boolean {
  if (!core) return true;
  const sig = sortedTokenSignature(core);
  if (seenSigs.some(s => s === sig)) return true;
  for (const s of seenCores) {
    if (core === s) return true;
    const shorter = core.length <= s.length ? core : s;
    const longer = core.length > s.length ? core : s;
    if (shorter.length >= 22 && longer.includes(shorter)) return true;
  }
  return false;
}

/**
 * 资产区仅展示日常例句时：去掉「在第一句前加 In my daily life / From my perspective」等得到的假第二条，
 * 保留先出现的句子，便于用户看到不同角度而非同一骨架。
 */
export function diverseDailyExamples(examples: ExampleSentence[]): ExampleSentence[] {
  const daily = examples.filter(e => e.scenario === 'daily');
  const out: ExampleSentence[] = [];
  const cores: string[] = [];
  const sigs: string[] = [];
  for (const ex of daily) {
    const core = normalizeExampleCore(ex.content);
    if (isRedundantCore(core, cores, sigs)) continue;
    cores.push(core);
    sigs.push(sortedTokenSignature(core));
    out.push(ex);
  }
  return out.length > 0 ? out : daily;
}

/** 实验室等需保留 zju/design 的场景：只压缩重复的 daily，顺序与原数组一致 */
export function filterCollocationExamplesForDisplay(examples: ExampleSentence[]): ExampleSentence[] {
  const keepDaily = new Set(diverseDailyExamples(examples).map(e => e.content));
  return examples.filter(ex => ex.scenario !== 'daily' || keepDaily.has(ex.content));
}
