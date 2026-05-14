import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteStuckPointFromLocal,
  deleteVocabCardFromLocal,
  getDueVocabCards,
  getLearningState,
  pushLearningState,
  syncLearningState,
  updateVocabReview,
} from '../../features/learning/store';
import type { StuckPointEntry, VocabCard, VocabCardItem } from '../../features/learning/types';
import { consumeAssetOpenIntent, getAuthToken, type AssetOpenIntent } from '../../platform/storage';

type AssetTab = 'vocab' | 'stuck';
type VocabSortMode = 'due' | 'newest' | 'alphaAsc' | 'alphaDesc';
type SentenceTile = { id: string; text: string };
type VocabReviewBatch = { initialized: boolean; ids: string[] };
type AssetSyncStatus = 'local' | 'syncing' | 'synced' | 'failed';

const VOCAB_SORT_LABELS: Record<VocabSortMode, string> = {
  due: '待复习优先',
  newest: '添加时间',
  alphaAsc: '首字母 A-Z',
  alphaDesc: '首字母 Z-A',
};

const VOCAB_SORT_OPTIONS: VocabSortMode[] = ['due', 'newest', 'alphaAsc', 'alphaDesc'];
const VOCAB_REVIEW_BATCH_SIZE = 10;

function normalizeSentence(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function countWords(value: string): number {
  return normalizeSpaces(value).split(/\s+/).filter(Boolean).length;
}

function normalizePhraseForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeReviewChunks(
  sentence: string,
  reviewChunks?: string[],
  protectedPhrases: string[] = [],
): string[] | null {
  const normalizedSentence = normalizeSpaces(sentence);
  if (!normalizedSentence || !Array.isArray(reviewChunks)) return null;

  const chunks = reviewChunks.map((chunk) => normalizeSpaces(chunk || '')).filter(Boolean);
  if (chunks.length < 2) return null;
  if (chunks.join(' ') !== normalizedSentence) return null;

  const sentenceWordCount = countWords(normalizedSentence);
  const chunkWordCounts = chunks.map(countWords);
  const oneWordChunks = chunkWordCounts.filter((n) => n <= 1).length;
  const maxChunkWords = Math.max(...chunkWordCounts);

  if (sentenceWordCount >= 9 && chunks.length < 3) return null;
  if (maxChunkWords > 6) return null;
  if (sentenceWordCount >= 9 && oneWordChunks > Math.max(1, Math.floor(chunks.length / 2))) return null;

  const searchableSentence = normalizePhraseForSearch(normalizedSentence);
  for (const phrase of protectedPhrases) {
    const normalizedPhrase = normalizePhraseForSearch(phrase);
    if (!normalizedPhrase || countWords(normalizedPhrase) < 2 || countWords(normalizedPhrase) > 6) continue;
    if (!searchableSentence.includes(normalizedPhrase)) continue;
    const keptInsideOneChunk = chunks.some((chunk) => normalizePhraseForSearch(chunk).includes(normalizedPhrase));
    if (!keptInsideOneChunk) return null;
  }

  return chunks;
}

function shuffleTiles(tiles: SentenceTile[]): SentenceTile[] {
  const next = [...tiles];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const CLAUSE_STARTERS = new Set([
  'because',
  'so',
  'but',
  'although',
  'though',
  'when',
  'while',
  'if',
  'since',
  'unless',
  'whereas',
]);

const SOFT_CLAUSE_STARTERS = new Set(['and', 'or']);

const WEAK_CHUNK_ENDINGS = new Set([
  'a',
  'an',
  'the',
  'my',
  'your',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
]);

function wordKey(value: string): string {
  return value.replace(/[^a-zA-Z']/g, '').toLowerCase();
}

function shouldStartNewClause(word: string, currentLength: number): boolean {
  const key = wordKey(word);
  if (CLAUSE_STARTERS.has(key)) return currentLength >= 3;
  return SOFT_CLAUSE_STARTERS.has(key) && currentLength >= 5;
}

function shouldEndClause(word: string, currentLength: number): boolean {
  if (/[;:!?]$/.test(word)) return true;
  return /,$/.test(word) && currentLength >= 4;
}

function splitIntoClauses(words: string[]): string[][] {
  const clauses: string[][] = [];
  let current: string[] = [];

  words.forEach((word) => {
    if (current.length > 0 && shouldStartNewClause(word, current.length)) {
      clauses.push(current);
      current = [];
    }

    current.push(word);

    if (shouldEndClause(word, current.length)) {
      clauses.push(current);
      current = [];
    }
  });

  if (current.length > 0) clauses.push(current);
  return clauses;
}

function pickChunkSize(remaining: number): number {
  if (remaining <= 5) return remaining;
  if (remaining <= 8) return Math.ceil(remaining / 2);
  return 4;
}

function avoidWeakEnding(words: string[], start: number, proposedEnd: number): number {
  if (proposedEnd >= words.length) return proposedEnd;
  const lastKey = wordKey(words[proposedEnd - 1] || '');
  if (WEAK_CHUNK_ENDINGS.has(lastKey)) {
    return Math.min(words.length, proposedEnd + 1);
  }
  return proposedEnd;
}

function splitClauseIntoPhraseChunks(words: string[]): string[][] {
  if (words.length <= 5) return [words];

  const chunks: string[][] = [];
  let cursor = 0;

  while (cursor < words.length) {
    const remaining = words.length - cursor;
    if (remaining <= 5) {
      chunks.push(words.slice(cursor));
      break;
    }

    const size = pickChunkSize(remaining);
    const end = avoidWeakEnding(words, cursor, cursor + size);
    chunks.push(words.slice(cursor, end));
    cursor = end;
  }

  return chunks;
}

function splitSentenceIntoTiles(sentence: string): SentenceTile[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const chunks = splitIntoClauses(words).flatMap(splitClauseIntoPhraseChunks);

  return chunks
    .map((chunk, index) => ({ id: `tile-${index}`, text: chunk.join(' ').trim() }))
    .filter((tile) => tile.text);
}

function getReviewTiles(item?: VocabCardItem): SentenceTile[] {
  const sentence = item?.sentence?.trim() || '';
  const chunks = normalizeReviewChunks(sentence, item?.reviewChunks, item?.collocationsUsed || []);

  if (chunks) {
    return chunks.map((chunk, index) => ({ id: `tile-${index}`, text: chunk }));
  }

  return splitSentenceIntoTiles(sentence);
}

function hasDueVocabCards(cards: VocabCard[]): boolean {
  const now = new Date().toISOString();
  return cards.some((card) => Boolean(card.nextDueAt && card.nextDueAt <= now));
}

function getDueVocabCardIds(cards: VocabCard[]): string[] {
  const now = new Date().toISOString();
  return getDueVocabCards(cards, cards.length || VOCAB_REVIEW_BATCH_SIZE)
    .filter((card) => card.nextDueAt && card.nextDueAt <= now)
    .map((card) => card.id);
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<AssetTab>('stuck');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>([]);
  const [vocabCards, setVocabCards] = useState<VocabCard[]>([]);
  const [selectedVocabCard, setSelectedVocabCard] = useState<VocabCard | null>(null);
  const [selectedStuckPoint, setSelectedStuckPoint] = useState<StuckPointEntry | null>(null);
  const [tilePool, setTilePool] = useState<SentenceTile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<SentenceTile[]>([]);
  const [tilePassed, setTilePassed] = useState(false);
  const [tileMessage, setTileMessage] = useState('');
  const [vocabSortMode, setVocabSortMode] = useState<VocabSortMode>('due');
  const [vocabReviewBatch, setVocabReviewBatch] = useState<VocabReviewBatch>({ initialized: false, ids: [] });
  const [message, setMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<AssetSyncStatus>('local');
  const lastAutoSyncAtRef = useRef(0);

  function applyLearningState(state: ReturnType<typeof getLearningState>, options?: { autoSelectDueVocab?: boolean }) {
    setStuckPoints(state.stuckPoints);
    setVocabCards(state.vocabCards);
    if (options?.autoSelectDueVocab && hasDueVocabCards(state.vocabCards)) {
      setActiveTab('vocab');
      setVocabSortMode('due');
      const dueIds = getDueVocabCardIds(state.vocabCards);
      setVocabReviewBatch((current) => {
        const remainingBatchIds = current.ids.filter((id) => dueIds.includes(id));
        if (current.initialized) {
          return { initialized: true, ids: remainingBatchIds };
        }
        return { initialized: true, ids: dueIds.slice(0, VOCAB_REVIEW_BATCH_SIZE) };
      });
    }
  }

  function refreshLocal(options?: { autoSelectDueVocab?: boolean }) {
    const state = getLearningState();
    applyLearningState(state, options);
    return state;
  }

  function applyAssetOpenIntent(intent: AssetOpenIntent, state: ReturnType<typeof getLearningState>) {
    if (intent.tab === 'stuck') {
      setActiveTab('stuck');
      const target = state.stuckPoints.find((item) => item.id === intent.itemId) || state.stuckPoints[0];
      if (target) setSelectedStuckPoint(target);
      return;
    }

    setActiveTab('vocab');
    const target = state.vocabCards.find((card) => card.id === intent.itemId) || state.vocabCards[0];
    if (target) openVocabCard(target);
  }

  function refreshFromLocalAndApplyIntent() {
    const intent = consumeAssetOpenIntent();
    const state = refreshLocal({ autoSelectDueVocab: !intent });
    if (intent) applyAssetOpenIntent(intent, state);
    return Boolean(intent);
  }

  async function syncAssets(options?: { manual?: boolean; autoSelectDueVocab?: boolean }) {
    const token = getAuthToken();
    if (!token) {
      setSyncStatus('local');
      if (options?.manual) {
        setMessage('未登录时会显示本机资产；登录后会自动同步到云端。');
      }
      return;
    }

    const now = Date.now();
    if (!options?.manual && now - lastAutoSyncAtRef.current < 30_000) return;
    lastAutoSyncAtRef.current = now;

    setSyncStatus('syncing');
    if (options?.manual) setMessage('');

    try {
      const state = await syncLearningState();
      applyLearningState(state, { autoSelectDueVocab: options?.autoSelectDueVocab ?? true });
      setSyncStatus('synced');
      if (options?.manual) setMessage('资产已刷新。');
    } catch (err) {
      refreshLocal({ autoSelectDueVocab: options?.autoSelectDueVocab ?? true });
      setSyncStatus('failed');
      if (options?.manual) {
        setMessage(err instanceof Error ? err.message : '云端暂时连不上，已显示本机资产。');
      }
    }
  }

  useEffect(() => {
    const hasIntent = refreshFromLocalAndApplyIntent();
    void syncAssets({ autoSelectDueVocab: !hasIntent });
  }, []);

  useDidShow(() => {
    const hasIntent = refreshFromLocalAndApplyIntent();
    void syncAssets({ autoSelectDueVocab: !hasIntent });
  });

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => {
      setMessage('');
    }, 2600);
    return () => clearTimeout(timer);
  }, [message]);

  const filteredStuck = useMemo(() => stuckPoints, [stuckPoints]);

  const filteredVocab = useMemo(() => {
    const now = new Date().toISOString();
    const ordered =
      vocabSortMode === 'due'
        ? getDueVocabCards(vocabCards, vocabCards.length || VOCAB_REVIEW_BATCH_SIZE)
        : [...vocabCards].sort((a, b) => {
            if (vocabSortMode === 'newest') {
              return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
            }
            const result = a.headword.localeCompare(b.headword, 'en', { sensitivity: 'base' });
            return vocabSortMode === 'alphaAsc' ? result : -result;
          });
    const fallbackBatchIds = getDueVocabCardIds(vocabCards).slice(0, VOCAB_REVIEW_BATCH_SIZE);
    const visible =
      vocabSortMode === 'due'
        ? ordered.filter((card) => {
            if (!card.nextDueAt || card.nextDueAt > now) return false;
            const batchIds = vocabReviewBatch.initialized ? vocabReviewBatch.ids : fallbackBatchIds;
            return batchIds.includes(card.id);
          })
        : ordered;
    return visible.map((card) => ({
      ...card,
      __isDue: Boolean(card.nextDueAt && card.nextDueAt <= now),
    })) as Array<VocabCard & { __isDue?: boolean }>;
  }, [vocabCards, vocabSortMode, vocabReviewBatch]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    if (activeTab === 'vocab') {
      return vocabCards
        .filter((card) =>
          [
            card.headword,
            card.sense,
            card.spokenPracticePhrase,
            card.registerGuide?.anchorZh,
            card.registerNoteZh,
            ...(card.tags || []),
            ...(card.registerGuide?.coreCollocations || []),
            ...card.items.flatMap((item) => [item.sentence, item.chinese, ...item.collocationsUsed]),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        )
        .sort((a, b) => a.headword.localeCompare(b.headword, 'en', { sensitivity: 'base' }))
        .slice(0, 20);
    }
    return stuckPoints
      .filter((item) =>
        [item.chineseThought, item.englishAttempt, item.recommendedExpression, item.aiSuggestion, item.contextCollocation]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [activeTab, searchQuery, stuckPoints, vocabCards]);

  const dueVocabIds = useMemo(() => getDueVocabCardIds(vocabCards), [vocabCards]);
  const dueVocabCount = dueVocabIds.length;
  const currentBatchDueCount = useMemo(
    () => vocabReviewBatch.ids.filter((id) => dueVocabIds.includes(id)).length,
    [dueVocabIds, vocabReviewBatch.ids],
  );
  const nextBatchCandidateCount = useMemo(() => {
    const currentIds = new Set(vocabReviewBatch.ids);
    return dueVocabIds.filter((id) => !currentIds.has(id)).length;
  }, [dueVocabIds, vocabReviewBatch.ids]);

  useEffect(() => {
    if (activeTab === 'vocab' && vocabSortMode === 'due' && dueVocabCount === 0 && vocabCards.length > 0) {
      setVocabSortMode('newest');
    }
  }, [activeTab, dueVocabCount, vocabCards.length, vocabSortMode]);

  const selectedVocabIsDue = Boolean(
    selectedVocabCard?.nextDueAt && selectedVocabCard.nextDueAt <= new Date().toISOString(),
  );
  const shouldShowVocabReorder = Boolean(selectedVocabIsDue && selectedVocabCard?.items[0]?.sentence);

  const placeholderText =
    activeTab === 'vocab'
      ? searchQuery.trim()
        ? '没有匹配的词卡。换个关键词试试。'
        : dueVocabCount > 0 && currentBatchDueCount === 0 && vocabSortMode === 'due'
          ? `本轮词卡已复习完。还剩 ${nextBatchCandidateCount} 张待复习，想继续可以再加 10 张。`
        : vocabCards.length > 0 && vocabSortMode === 'due'
          ? '今天没有待复习词卡。想浏览全部词卡，可以切换到添加时间或首字母排序。'
          : '还没有词卡。可以先去“工坊”生成一张。'
      : searchQuery.trim()
        ? '没有匹配的卡壳点。换个关键词试试。'
        : '还没有卡壳点。保存表达指导后会沉淀到这里。';

  async function pushDeletionToCloud(successMessage: string) {
    if (!getAuthToken()) {
      setMessage(successMessage);
      return;
    }
    try {
      const state = await pushLearningState();
      setStuckPoints(state.stuckPoints);
      setVocabCards(state.vocabCards);
      setMessage(`${successMessage} 已同步到云端。`);
    } catch (err) {
      setMessage(err instanceof Error ? `本地已删除，但云端同步失败：${err.message}` : '本地已删除，但云端同步失败。');
    }
  }

  function copy(text: string) {
    wx.setClipboardData({ data: text });
  }

  function confirmDeleteVocabCard(card: VocabCard) {
    Taro.showModal({
      title: '删除词卡',
      content: `确定删除“${card.headword}”吗？删除后不会再出现在小程序资产库里。`,
      confirmText: '删除',
      confirmColor: '#be123c',
      success(result) {
        if (!result.confirm) return;
        const next = deleteVocabCardFromLocal(card.id);
        setVocabCards(next.vocabCards);
        if (selectedVocabCard?.id === card.id) closeVocabCard();
        void pushDeletionToCloud('词卡已删除。');
      },
    });
  }

  function confirmDeleteStuckPoint(item: StuckPointEntry) {
    Taro.showModal({
      title: '删除卡壳点',
      content: `确定删除“${item.chineseThought}”吗？`,
      confirmText: '删除',
      confirmColor: '#be123c',
      success(result) {
        if (!result.confirm) return;
        const next = deleteStuckPointFromLocal(item.id);
        setStuckPoints(next.stuckPoints);
        if (selectedStuckPoint?.id === item.id) setSelectedStuckPoint(null);
        void pushDeletionToCloud('卡壳点已删除。');
      },
    });
  }

  function getVocabBrief(card: VocabCard): string {
    return (
      card.registerGuide?.anchorZh ||
      card.registerNoteZh ||
      card.items.find((item) => item.chinese)?.chinese ||
      card.sense ||
      '暂无中文释义'
    );
  }

  function getStuckPreview(item: StuckPointEntry): string {
    return item.englishAttempt || item.recommendedExpression || item.aiSuggestion || '暂无英文表达';
  }

  function getStuckCopyText(item: StuckPointEntry): string {
    return item.englishAttempt || item.recommendedExpression || item.chineseThought;
  }

  function formatDate(value?: string | null): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }

  function formatDetailDate(value?: string | null): string {
    if (!value) return '暂无';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '暂无';
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function chooseVocabSort() {
    Taro.showActionSheet({
      itemList: VOCAB_SORT_OPTIONS.map((option) => VOCAB_SORT_LABELS[option]),
      success(result) {
        const nextMode = VOCAB_SORT_OPTIONS[result.tapIndex] || 'due';
        setVocabSortMode(nextMode);
      },
    });
  }

  function openSearch() {
    setSearchVisible(true);
    setSearchQuery('');
  }

  function closeSearch() {
    setSearchVisible(false);
    setSearchQuery('');
  }

  function getSyncStatusText(): string {
    if (!getAuthToken()) return '未登录，仅显示本机资产';
    if (syncStatus === 'syncing') return '正在自动同步云端资产';
    if (syncStatus === 'synced') return '已自动同步云端资产';
    if (syncStatus === 'failed') return '云端暂时连不上，已显示本机资产';
    return '进入资产库后会自动同步';
  }

  function appendNextVocabReviewBatch() {
    setVocabReviewBatch((current) => {
      const currentIds = new Set(current.ids);
      const nextIds = dueVocabIds
        .filter((id) => !currentIds.has(id))
        .slice(0, VOCAB_REVIEW_BATCH_SIZE);
      return { initialized: true, ids: [...current.ids, ...nextIds] };
    });
  }

  function openVocabCard(card: VocabCard) {
    const item = card.items[0];
    const isDue = Boolean(card.nextDueAt && card.nextDueAt <= new Date().toISOString());
    setSelectedVocabCard(card);
    setSelectedTiles([]);
    setTilePassed(false);
    setTileMessage('');
    setTilePool(isDue && item?.sentence ? shuffleTiles(getReviewTiles(item)) : []);
  }

  function closeVocabCard() {
    setSelectedVocabCard(null);
    setSelectedTiles([]);
    setTilePool([]);
    setTilePassed(false);
    setTileMessage('');
  }

  function openSearchResult(item: VocabCard | StuckPointEntry) {
    closeSearch();
    if (activeTab === 'vocab') {
      openVocabCard(item as VocabCard);
      return;
    }
    setSelectedStuckPoint(item as StuckPointEntry);
  }

  function moveTileToAnswer(tile: SentenceTile) {
    if (tilePassed) return;
    setTilePool((current) => current.filter((item) => item.id !== tile.id));
    setSelectedTiles((current) => [...current, tile]);
    setTileMessage('');
  }

  function moveTileToPool(tile: SentenceTile) {
    if (tilePassed) return;
    setSelectedTiles((current) => current.filter((item) => item.id !== tile.id));
    setTilePool((current) => [...current, tile]);
    setTileMessage('');
  }

  function checkTileOrder() {
    const sentence = selectedVocabCard?.items[0]?.sentence || '';
    if (!sentence) return;
    const reconstructed = selectedTiles.map((tile) => tile.text).join(' ');
    if (normalizeSentence(reconstructed) === normalizeSentence(sentence)) {
      setTilePassed(true);
      setTileMessage('顺序对了，现在再判断这张卡是否记住。');
      return;
    }
    setTileMessage('顺序还不对，点已选词块可以放回下方重排。');
  }

  async function review(cardId: string, result: 'remembered' | 'struggled') {
    const next = updateVocabReview(cardId, result);
    setVocabCards(next.vocabCards);
    closeVocabCard();
    Taro.showToast({
      title: result === 'remembered' ? '已记录，下次再复习' : '已记录，明天再看',
      icon: 'success',
    });
    if (getAuthToken()) {
      await syncLearningState()
        .then((state) => {
          setVocabCards(state.vocabCards);
        })
        .catch(() => {
          Taro.showToast({
            title: '本地已保存，云同步失败',
            icon: 'none',
          });
        });
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="asset-hero-header">
          <View>
            <View className="eyebrow">统一管理</View>
            <View className="title">资产库</View>
          </View>
          <Button className="toolbar-button search-trigger-button" onClick={openSearch}>
            搜索
          </Button>
        </View>
        <View className="subtitle">
          这里统一管理词卡和卡壳点。生产入口负责生成，资产库负责搜索、复制和复习。
        </View>
        <View className="segmented-control">
          <Button
            className={activeTab === 'vocab' ? 'segment-button active' : 'segment-button'}
            onClick={() => setActiveTab('vocab')}
          >
            词卡{dueVocabCount ? ` ${dueVocabCount}` : ''}
          </Button>
          <Button
            className={activeTab === 'stuck' ? 'segment-button active' : 'segment-button'}
            onClick={() => setActiveTab('stuck')}
          >
            卡壳
          </Button>
        </View>
        <View className="asset-sync-row">
          <View className="asset-sync-copy">
            <View className="asset-sync-title">同步状态</View>
            <View className="asset-sync-subtitle">{getSyncStatusText()}</View>
          </View>
          <Button
            className="toolbar-button asset-refresh-button"
            loading={syncStatus === 'syncing'}
            disabled={syncStatus === 'syncing'}
            onClick={() => syncAssets({ manual: true })}
          >
            {syncStatus === 'syncing' ? '同步中' : '刷新'}
          </Button>
        </View>
        {message ? (
          <View className={message.includes('失败') || message.includes('请先') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>
      {activeTab === 'vocab' && filteredVocab.length === 0 ? (
        <View className="placeholder-card">{placeholderText}</View>
      ) : null}
      {activeTab === 'stuck' && filteredStuck.length === 0 ? (
        <View className="placeholder-card">{placeholderText}</View>
      ) : null}
      {activeTab === 'vocab'
        ? (
            <>
              <View className="asset-toolbar">
                <Text>
                  {vocabSortMode === 'due'
                    ? currentBatchDueCount > 0
                      ? `本轮还剩 ${currentBatchDueCount} 张 · 总待复习 ${dueVocabCount} 张`
                      : `本轮已完成 · 还剩 ${nextBatchCandidateCount} 张`
                    : `共 ${filteredVocab.length} 张 · ${dueVocabCount} 张待复习`}
                </Text>
                <Button className="toolbar-button" onClick={chooseVocabSort}>
                  {VOCAB_SORT_LABELS[vocabSortMode]}
                </Button>
              </View>
              {filteredVocab.map((card) => (
                <View className="vocab-compact-card" key={card.id} onClick={() => openVocabCard(card)}>
                  <View className="vocab-compact-main">
                    <View className="vocab-compact-headword">{card.headword}</View>
                    <View className="vocab-compact-brief">{getVocabBrief(card)}</View>
                  </View>
                  <View className="vocab-compact-meta">
                    <View className={card.__isDue ? 'vocab-status due' : 'vocab-status'}>{card.__isDue ? '待复习' : '词卡'}</View>
                    <View className="vocab-date">{formatDate(card.timestamp)}</View>
                    <Button
                      className="compact-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmDeleteVocabCard(card);
                      }}
                    >
                      删除
                    </Button>
                  </View>
                </View>
              ))}
              {vocabSortMode === 'due' && currentBatchDueCount === 0 && nextBatchCandidateCount > 0 ? (
                <Button
                  className="secondary-button"
                  onClick={appendNextVocabReviewBatch}
                >
                  再加 10 张
                </Button>
              ) : null}
            </>
          )
        : null}
      {activeTab === 'stuck'
        ? filteredStuck.map((item) => (
            <View className="stuck-compact-card" key={item.id} onClick={() => setSelectedStuckPoint(item)}>
              <View className="stuck-compact-main">
                <View className="stuck-compact-title">{item.chineseThought}</View>
                {item.recommendedExpression ? (
                  <View className="stuck-compact-expression">{item.recommendedExpression}</View>
                ) : null}
                <View className="stuck-compact-preview">{getStuckPreview(item)}</View>
              </View>
              <Button
                className="compact-copy-button"
                onClick={(event) => {
                  event.stopPropagation();
                  copy(getStuckCopyText(item));
                }}
              >
                复制
              </Button>
              <Button
                className="compact-delete-button"
                onClick={(event) => {
                  event.stopPropagation();
                  confirmDeleteStuckPoint(item);
                }}
              >
                删除
              </Button>
            </View>
          ))
        : null}
      {selectedVocabCard ? (
        <View className="modal-backdrop" onClick={closeVocabCard}>
          <View className="modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="modal-header">
              <View>
                <View className="result-label">
                  {selectedVocabIsDue ? '待复习' : '词卡'}
                </View>
                <View className="recommended-expression">{selectedVocabCard.headword}</View>
              </View>
              <Button className="modal-close" onClick={closeVocabCard}>×</Button>
            </View>
            {selectedVocabCard.registerGuide?.anchorZh || selectedVocabCard.registerNoteZh ? (
              <View className="guidance-card">
                <Text>{selectedVocabCard.registerGuide?.anchorZh || selectedVocabCard.registerNoteZh}</Text>
              </View>
            ) : null}
            {selectedVocabCard.registerGuide?.coreCollocations?.length ? (
                <View className="chip-row">
                  {selectedVocabCard.registerGuide.coreCollocations.map((item) => (
                    <View className="chip" key={item}>{item}</View>
                  ))}
                </View>
              ) : null}
              {!shouldShowVocabReorder
                ? selectedVocabCard.items.map((item) => (
                  <View className="example-card" key={item.id}>
                    <View className="example-sentence">{item.sentence}</View>
                    {item.chinese ? <View className="example-chinese">{item.chinese}</View> : null}
                    {item.collocationsUsed?.length ? (
                      <View className="chip-row">
                        {item.collocationsUsed.map((phrase) => (
                          <View className="chip" key={phrase}>{phrase}</View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))
                : null}
              {shouldShowVocabReorder ? (
                <View className="tile-review-card">
                  <View className="tile-review-header">
                    <View>
                      <View className="tile-review-title">句子重排检验</View>
                      <View className="tile-review-subtitle">
                        先根据中文提示拼回英文句子，再选择复习结果。
                      </View>
                    </View>
                    <View className={tilePassed ? 'tile-count passed' : 'tile-count'}>
                      {selectedTiles.length}/{selectedTiles.length + tilePool.length}
                    </View>
                  </View>
                  {selectedVocabCard.items[0]?.chinese ? (
                    <View className="tile-prompt-block">
                      <View className="tile-prompt-label">提示中文</View>
                      <View className="tile-prompt-card">{selectedVocabCard.items[0].chinese}</View>
                    </View>
                  ) : null}
                  <View className="tile-area-title">你的英文</View>
                  <View className="tile-answer-box">
                    {selectedTiles.length ? (
                      selectedTiles.map((tile) => (
                        <Button className="selected-tile" key={tile.id} onClick={() => moveTileToPool(tile)}>
                          {tile.text}
                        </Button>
                      ))
                    ) : (
                      <Text>点击下方词块开始重排</Text>
                    )}
                  </View>
                  <View className="tile-area-title">词块</View>
                  <View className="tile-pool">
                    {tilePool.map((tile) => (
                      <Button className="pool-tile" key={tile.id} onClick={() => moveTileToAnswer(tile)}>
                        {tile.text}
                      </Button>
                    ))}
                  </View>
                  {tileMessage ? (
                    <View className={tilePassed ? 'tile-message success' : 'tile-message'}>
                      {tileMessage}
                    </View>
                  ) : null}
                  <Button
                    className="primary-button tile-check-button"
                    disabled={tilePassed || selectedTiles.length !== selectedTiles.length + tilePool.length}
                    onClick={checkTileOrder}
                  >
                    {tilePassed ? '已拼对' : '检查顺序'}
                  </Button>
                </View>
              ) : null}
              {selectedVocabIsDue ? (
                <View className="review-action-row">
                  <Button
                    className="primary-button review-action-button"
                    disabled={shouldShowVocabReorder && !tilePassed}
                    onClick={() => review(selectedVocabCard.id, 'remembered')}
                  >
                    记住了
                  </Button>
                  <Button
                    className="secondary-button review-action-button"
                    onClick={() => review(selectedVocabCard.id, 'struggled')}
                  >
                    还不熟
                  </Button>
                </View>
              ) : null}
              {selectedVocabCard.items[0]?.sentence ? (
                <Button className="secondary-button" onClick={() => copy(selectedVocabCard.items[0].sentence)}>复制例句</Button>
              ) : null}
              <Button className="danger-button" onClick={() => confirmDeleteVocabCard(selectedVocabCard)}>
                删除词卡
              </Button>
          </View>
        </View>
      ) : null}
      {searchVisible ? (
        <View className="modal-backdrop" onClick={closeSearch}>
          <View className="modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="modal-header">
              <View>
                <View className="result-label">{activeTab === 'vocab' ? '搜索词卡' : '搜索卡壳点'}</View>
                <View className="result-section-title search-modal-title">
                  {activeTab === 'vocab' ? '输入英文、中文或搭配' : '输入中文、英文或推荐表达'}
                </View>
              </View>
              <Button className="modal-close" onClick={closeSearch}>×</Button>
            </View>
            <Input
              value={searchQuery}
              onInput={(event) => setSearchQuery(String(event.detail.value || ''))}
              placeholder={activeTab === 'vocab' ? '搜索词卡' : '搜索卡壳点'}
              className="asset-search-input"
              focus
            />
            {!searchQuery.trim() ? (
              <View className="placeholder-card">输入关键词后，会显示简略结果。点一下就会打开完整卡片。</View>
            ) : searchResults.length === 0 ? (
              <View className="placeholder-card">没有匹配结果，换个词再试试。</View>
            ) : (
              <View className="search-result-list">
                {activeTab === 'vocab'
                  ? (searchResults as VocabCard[]).map((card) => (
                      <View className="search-result-card" key={card.id} onClick={() => openSearchResult(card)}>
                        <View className="search-result-title">{card.headword}</View>
                        <View className="search-result-brief">{getVocabBrief(card)}</View>
                      </View>
                    ))
                  : (searchResults as StuckPointEntry[]).map((item) => (
                      <View className="search-result-card" key={item.id} onClick={() => openSearchResult(item)}>
                        <View className="search-result-title">{item.chineseThought}</View>
                        <View className="search-result-brief">
                          {item.recommendedExpression || getStuckPreview(item)}
                        </View>
                      </View>
                    ))}
              </View>
            )}
          </View>
        </View>
      ) : null}
      {selectedStuckPoint ? (
        <View className="modal-backdrop" onClick={() => setSelectedStuckPoint(null)}>
          <View className="modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="modal-header">
              <View className="stuck-modal-main">
                <View className="result-label">卡壳点</View>
                <View className="recommended-expression">{selectedStuckPoint.chineseThought}</View>
              </View>
              <View className="stuck-modal-side">
                <Button className="modal-close" onClick={() => setSelectedStuckPoint(null)}>×</Button>
                <View className="stuck-detail-time">{formatDetailDate(selectedStuckPoint.timestamp)}</View>
              </View>
            </View>
            {selectedStuckPoint.recommendedExpression ? (
              <View className="chip-row">
                <View className="chip">{selectedStuckPoint.recommendedExpression}</View>
              </View>
            ) : null}
            <View className="example-card">
              <View className="example-sentence">{getStuckPreview(selectedStuckPoint)}</View>
            </View>
            {selectedStuckPoint.aiSuggestion ? (
              <View className="guidance-card">
                <Text>{selectedStuckPoint.aiSuggestion}</Text>
              </View>
            ) : null}
            <Button className="secondary-button" onClick={() => copy(getStuckCopyText(selectedStuckPoint))}>
              复制表达
            </Button>
            <Button className="danger-button" onClick={() => confirmDeleteStuckPoint(selectedStuckPoint)}>
              删除卡壳点
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
