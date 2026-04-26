import type { StuckPointEntry } from '../store/useStore';

/** 旧版存入：`[实验室 · have a break] 喝一口水` */
const LEGACY_BRACKET_PREFIX = /^\[\s*([^\]·]+)\s*·\s*([^\]]+?)\s*\]\s*([\s\S]+)$/u;

export type StuckPointDisplay = {
  chinese: string;
  /** 标题右侧：对应中文卡壳点的英文说法（从 AI 建议解析或用户尝试），不是本关练习搭配 */
  titleEnglish: string | undefined;
  /** 实验室造句时的目标动词搭配，仅在展开区展示 */
  practiceCollocation: string | undefined;
  sourceLabel: string | undefined;
};

/** 从 AI 建议里抓「可以说 …」等典型英文推荐语 */
export function extractTitleEnglishFromAiSuggestion(text: string): string | undefined {
  const s = text.replace(/\u200b/g, '').replace(/\r\n/g, '\n').trim();
  if (!s) return undefined;

  const tryPatterns: RegExp[] = [
    /可以说\s*['\u2018]([^'\u2019\n]{3,120})['\u2019]/,
    /(?:可以说成|试试说)[:：]?\s*['\u2018]([^'\u2019\n]{3,120})['\u2019]/,
    /(?:或者|、)\s*更简单的\s*['\u2018]([^'\u2019\n]{3,120})['\u2019]/,
    /(?:推荐|建议说|试试)[:：]\s*['\u2018]([^'\u2019\n]{3,120})['\u2019]/,
    /如[:：]\s*['\u2018]([a-zA-Z][^'\u2019\n]{2,100})['\u2019]/,
    /可以说\s*[「『]([^」』]{3,120})[」』]/,
    /(?:可以说|可以直接说|推荐说法|推荐表达|英文可以说|更自然的说法|例句)[:：]\s*([A-Za-z][^。\n！？]{3,160})/,
  ];

  for (const re of tryPatterns) {
    const m = s.match(re);
    if (m?.[1]) {
      const c = m[1].trim();
      if (/[a-zA-Z]{2,}/.test(c)) return c;
    }
  }

  const quoted = s.match(/['\u2018]([a-zA-Z][a-zA-Z\s,.'-]{4,90})['\u2019]/);
  if (quoted?.[1] && /\s/.test(quoted[1])) return quoted[1].trim();

  const lines = s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const normalized = line
      .replace(/^[-*•\d.\s]+/, '')
      .replace(/^(例句|表达|推荐说法|推荐表达|可以说|英文可以说)[:：]\s*/u, '')
      .trim();
    if (!normalized) continue;
    if (/[\u4e00-\u9fa5]/.test(normalized)) continue;
    if (!/[A-Za-z]/.test(normalized)) continue;
    if (normalized.split(/\s+/).length < 3) continue;
    return normalized;
  }

  return undefined;
}

function looksLikeUserEnglishAttempt(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && /[a-zA-Z]/.test(t) && !/^[\d\s.,!?]+$/.test(t);
}

export function getStuckPointDisplay(entry: StuckPointEntry): StuckPointDisplay {
  const fromMode =
    entry.sourceMode === 'test'
      ? '实验室'
      : entry.sourceMode === 'field'
        ? '实战仓'
        : entry.sourceMode === 'free'
          ? '自由表达'
          : undefined;

  const fromAi = entry.recommendedExpression?.trim() || extractTitleEnglishFromAiSuggestion(entry.aiSuggestion);
  const attempt = entry.englishAttempt?.trim();

  const colloc = entry.contextCollocation?.trim();
  if (colloc) {
    return {
      chinese: entry.chineseThought.trim(),
      titleEnglish: fromAi,
      practiceCollocation: colloc,
      sourceLabel: fromMode,
    };
  }

  const m = entry.chineseThought.match(LEGACY_BRACKET_PREFIX);
  if (m) {
    const practice = m[2].trim();
    return {
      chinese: m[3].trim(),
      titleEnglish: fromAi,
      practiceCollocation: practice,
      sourceLabel: m[1].trim(),
    };
  }

  return {
    chinese: entry.chineseThought.trim(),
    titleEnglish: fromAi || (attempt && looksLikeUserEnglishAttempt(attempt) ? attempt : undefined),
    practiceCollocation: undefined,
    sourceLabel: fromMode,
  };
}
