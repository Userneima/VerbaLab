import { getDailyCollocations } from '../data/verbData';
import { normalizeForMatch } from './reviewGate';

export type SentenceTile = { id: string; text: string };
export type SentenceTileDifficulty = 'phrase' | 'word';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 按空白切分，保留每段原文（含标点附着） */
export function tokenizeSentenceToTiles(sentence: string): SentenceTile[] {
  return sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text, i) => ({ id: `r${i}`, text }));
}

const HARD_PUNCTUATION_RE = /[;:!?]$/;
const SOFT_PUNCTUATION_RE = /[,]$/;
const CLAUSE_STARTERS = new Set([
  'and',
  'but',
  'because',
  'so',
  'that',
  'which',
  'who',
  'when',
  'while',
  'if',
  'although',
  'though',
  'since',
  'unless',
  'where',
  'after',
  'before',
  'then',
]);

function shouldBreakBeforeWord(word: string): boolean {
  return CLAUSE_STARTERS.has(wordKey(word));
}

function shouldBreakAfterWord(word: string): boolean {
  return HARD_PUNCTUATION_RE.test(word) || SOFT_PUNCTUATION_RE.test(word);
}

/**
 * 面向较长句子的“短语块”切分：
 * 默认先给用户 2~5 词的自然短语块，尽量顺着标点和连接词断开，
 * 避免出现 “keys; they” 这类半截拼接。
 */
export function tokenizeSentenceToChunkedTiles(sentence: string): SentenceTile[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 8) {
    return words.map((text, i) => ({ id: `r${i}`, text }));
  }

  const tiles: SentenceTile[] = [];
  let current: string[] = [];
  const minChunkWords = 2;
  const softTarget = 5;
  const maxChunkWords = 6;

  words.forEach((word, index) => {
    const nextWord = words[index + 1];
    current.push(word);

    const currentLength = current.length;
    const remaining = words.length - index - 1;
    const nextWordHasBoundary = nextWord ? shouldBreakAfterWord(nextWord) : false;
    const breakAfterPunctuation = shouldBreakAfterWord(word) && currentLength >= minChunkWords;
    const breakBeforeClause = nextWord && shouldBreakBeforeWord(nextWord) && currentLength >= minChunkWords;
    const hitSoftTarget =
      currentLength >= softTarget &&
      (remaining === 0 || remaining >= minChunkWords) &&
      !nextWordHasBoundary;
    const hitMax = currentLength >= maxChunkWords;

    if (breakAfterPunctuation || breakBeforeClause || hitSoftTarget || hitMax || remaining === 0) {
      const chunk = current.join(' ').trim();
      if (chunk) tiles.push({ id: `r${tiles.length}`, text: chunk });
      current = [];
    }
  });

  return tiles;
}

function wordKey(w: string): string {
  return w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
}

function forbiddenKeys(referenceSentence: string): Set<string> {
  const set = new Set<string>();
  for (const w of referenceSentence.split(/\s+/)) {
    const k = wordKey(w);
    if (k) set.add(k);
  }
  return set;
}

const FALLBACK_DISTRACTORS = [
  'maybe',
  'because',
  'although',
  'usually',
  'never',
  'something',
  'anything',
  'everyone',
  'nothing',
  'sometimes',
];

/**
 * 从搭配库中抽词作干扰项（排除句中已出现的词形），不足时用兜底词表。
 */
export function pickDistractorWords(referenceSentence: string, count: number): string[] {
  const forbidden = forbiddenKeys(referenceSentence);
  const pool: string[] = [];
  const seen = new Set<string>();

  for (const { collocation } of getDailyCollocations()) {
    for (const raw of collocation.phrase.split(/\s+/)) {
      const w = raw.replace(/[^a-zA-Z']/g, '');
      if (w.length < 2) continue;
      const k = wordKey(w);
      if (!k || forbidden.has(k) || seen.has(k)) continue;
      seen.add(k);
      pool.push(w.toLowerCase());
    }
  }

  for (const w of FALLBACK_DISTRACTORS) {
    const k = wordKey(w);
    if (!forbidden.has(k) && !seen.has(k)) {
      seen.add(k);
      pool.push(w);
    }
  }

  return shuffle(pool).slice(0, Math.max(0, count));
}

export function buildShuffledTilePool(referenceSentence: string, distractorCount: number): SentenceTile[] {
  const refTiles = tokenizeSentenceToTiles(referenceSentence);
  const dWords = pickDistractorWords(referenceSentence, distractorCount);
  const distractorTiles: SentenceTile[] = dWords.map((text, i) => ({ id: `d${i}`, text }));
  return shuffle([...refTiles, ...distractorTiles]);
}

export function buildShuffledChunkTilePool(referenceSentence: string): SentenceTile[] {
  return shuffle(tokenizeSentenceToChunkedTiles(referenceSentence));
}

export function verifyReconstructedSentence(selected: SentenceTile[], referenceSentence: string): boolean {
  const built = selected.map(t => t.text).join(' ');
  return normalizeForMatch(built) === normalizeForMatch(referenceSentence);
}
