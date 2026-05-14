import { getDailyCollocations } from '../data/verbData';
import { normalizeForMatch } from './reviewGate';

export type SentenceTile = { id: string; text: string };
export type SentenceTileDifficulty = 'phrase' | 'word';
export type ReviewChunkOptions = {
  reviewChunks?: string[];
  protectedPhrases?: string[];
};

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

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  return normalizeSpaces(text).split(/\s+/).filter(Boolean).length;
}

function normalizePhraseForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function phraseIsProtectedByChunk(chunks: string[], phrase: string): boolean {
  const normalizedPhrase = normalizePhraseForSearch(phrase);
  if (!normalizedPhrase || countWords(normalizedPhrase) < 2 || countWords(normalizedPhrase) > 6) {
    return true;
  }
  return chunks.some((chunk) => normalizePhraseForSearch(chunk).includes(normalizedPhrase));
}

export function normalizeSentenceReviewChunks(
  sentence: string,
  reviewChunks?: string[],
  protectedPhrases: string[] = [],
): string[] | null {
  const normalizedSentence = normalizeSpaces(sentence);
  if (!normalizedSentence || !Array.isArray(reviewChunks)) return null;

  const chunks = reviewChunks
    .map((chunk) => normalizeSpaces(String(chunk || '')))
    .filter(Boolean);

  if (chunks.length < 2) return null;
  if (chunks.join(' ') !== normalizedSentence) return null;

  const sentenceWordCount = countWords(normalizedSentence);
  const chunkWordCounts = chunks.map(countWords);
  const oneWordChunks = chunkWordCounts.filter((n) => n <= 1).length;
  const maxChunkWords = Math.max(...chunkWordCounts);

  if (sentenceWordCount >= 9 && chunks.length < 3) return null;
  if (maxChunkWords > 6) return null;
  if (sentenceWordCount >= 9 && oneWordChunks > Math.max(1, Math.floor(chunks.length / 2))) {
    return null;
  }

  const searchableSentence = normalizePhraseForSearch(normalizedSentence);
  for (const phrase of protectedPhrases) {
    const normalizedPhrase = normalizePhraseForSearch(phrase);
    if (!normalizedPhrase || !searchableSentence.includes(normalizedPhrase)) continue;
    if (!phraseIsProtectedByChunk(chunks, phrase)) return null;
  }

  return chunks;
}

export function buildSentenceReviewChunkTiles(
  sentence: string,
  options: ReviewChunkOptions = {},
): SentenceTile[] {
  const chunks = normalizeSentenceReviewChunks(
    sentence,
    options.reviewChunks,
    options.protectedPhrases,
  );
  if (chunks) {
    return chunks.map((text, i) => ({ id: `r${i}`, text }));
  }
  return tokenizeSentenceToChunkedTiles(sentence);
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

export function buildShuffledChunkTilePool(
  referenceSentence: string,
  options: ReviewChunkOptions = {},
): SentenceTile[] {
  return shuffle(buildSentenceReviewChunkTiles(referenceSentence, options));
}

export function sentenceSupportsWordDifficultyUpgrade(referenceSentence: string): boolean {
  return tokenizeSentenceToChunkedTiles(referenceSentence).length < tokenizeSentenceToTiles(referenceSentence).length;
}

export function verifyReconstructedSentence(selected: SentenceTile[], referenceSentence: string): boolean {
  const built = selected.map(t => t.text).join(' ');
  return normalizeForMatch(built) === normalizeForMatch(referenceSentence);
}
