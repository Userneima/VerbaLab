import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  deleteStuckPointFromLocal,
  deleteVocabCardFromLocal,
  getDueVocabCards,
  getLearningState,
  pushLearningState,
  syncLearningState,
  updateVocabReview,
} from '../../features/learning/store';
import type { StuckPointEntry, VocabCard } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

type AssetTab = 'vocab' | 'stuck';
type VocabSortMode = 'due' | 'newest' | 'alphaAsc' | 'alphaDesc';
type SentenceTile = { id: string; text: string };

const VOCAB_SORT_LABELS: Record<VocabSortMode, string> = {
  due: '待复习优先',
  newest: '添加时间',
  alphaAsc: '首字母 A-Z',
  alphaDesc: '首字母 Z-A',
};

const VOCAB_SORT_OPTIONS: VocabSortMode[] = ['due', 'newest', 'alphaAsc', 'alphaDesc'];

function normalizeSentence(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffleTiles(tiles: SentenceTile[]): SentenceTile[] {
  const next = [...tiles];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function splitSentenceIntoTiles(sentence: string): SentenceTile[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 8) {
    return words.map((text, index) => ({ id: `tile-${index}`, text }));
  }

  const chunkCount = Math.min(7, Math.max(4, Math.round(words.length / 3)));
  const baseSize = Math.floor(words.length / chunkCount);
  const extra = words.length % chunkCount;
  const tiles: SentenceTile[] = [];
  let cursor = 0;

  for (let index = 0; index < chunkCount; index += 1) {
    const size = baseSize + (index < extra ? 1 : 0);
    const text = words.slice(cursor, cursor + size).join(' ');
    if (text) tiles.push({ id: `tile-${index}`, text });
    cursor += size;
  }

  return tiles;
}

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('stuck');
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>([]);
  const [vocabCards, setVocabCards] = useState<VocabCard[]>([]);
  const [selectedVocabCard, setSelectedVocabCard] = useState<VocabCard | null>(null);
  const [selectedStuckPoint, setSelectedStuckPoint] = useState<StuckPointEntry | null>(null);
  const [tilePool, setTilePool] = useState<SentenceTile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<SentenceTile[]>([]);
  const [tilePassed, setTilePassed] = useState(false);
  const [tileMessage, setTileMessage] = useState('');
  const [vocabSortMode, setVocabSortMode] = useState<VocabSortMode>('due');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function refreshLocal() {
    const state = getLearningState();
    setStuckPoints(state.stuckPoints);
    setVocabCards(state.vocabCards);
  }

  useEffect(() => {
    refreshLocal();
  }, []);

  const filteredStuck = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stuckPoints;
    return stuckPoints.filter((item) =>
      [item.chineseThought, item.englishAttempt, item.recommendedExpression, item.aiSuggestion, item.contextCollocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [stuckPoints, query]);

  const filteredVocab = useMemo(() => {
    const now = new Date().toISOString();
    const ordered =
      vocabSortMode === 'due'
        ? getDueVocabCards(vocabCards, vocabCards.length || 20)
        : [...vocabCards].sort((a, b) => {
            if (vocabSortMode === 'newest') {
              return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
            }
            const result = a.headword.localeCompare(b.headword, 'en', { sensitivity: 'base' });
            return vocabSortMode === 'alphaAsc' ? result : -result;
          });
    const q = query.trim().toLowerCase();
    const filtered = q
      ? ordered.filter((card) =>
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
      : ordered;
    return filtered.map((card) => ({
      ...card,
      __isDue: Boolean(card.nextDueAt && card.nextDueAt <= now),
    })) as Array<VocabCard & { __isDue?: boolean }>;
  }, [vocabCards, query, vocabSortMode]);

  const dueVocabCount = useMemo(
    () => vocabCards.filter((card) => card.nextDueAt && card.nextDueAt <= new Date().toISOString()).length,
    [vocabCards],
  );

  const placeholderText =
    activeTab === 'vocab'
      ? '还没有词卡。可以先去“工坊”生成一张。'
      : '还没有卡壳点。保存表达指导后会沉淀到这里。';

  async function syncNow() {
    if (!getAuthToken()) {
      setMessage('请先到“我的”完成微信登录和邀请码绑定，再同步资产。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const state = await syncLearningState();
      setStuckPoints(state.stuckPoints);
      setVocabCards(state.vocabCards);
      setMessage('资产已同步。');
    } catch (err) {
      refreshLocal();
      setMessage(err instanceof Error ? err.message : '同步失败，已显示本地内容。');
    } finally {
      setLoading(false);
    }
  }

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

  function chooseVocabSort() {
    Taro.showActionSheet({
      itemList: VOCAB_SORT_OPTIONS.map((option) => VOCAB_SORT_LABELS[option]),
      success(result) {
        setVocabSortMode(VOCAB_SORT_OPTIONS[result.tapIndex] || 'due');
      },
    });
  }

  function openVocabCard(card: VocabCard) {
    const sentence = card.items[0]?.sentence || '';
    setSelectedVocabCard(card);
    setSelectedTiles([]);
    setTilePassed(false);
    setTileMessage('');
    setTilePool(sentence ? shuffleTiles(splitSentenceIntoTiles(sentence)) : []);
  }

  function closeVocabCard() {
    setSelectedVocabCard(null);
    setSelectedTiles([]);
    setTilePool([]);
    setTilePassed(false);
    setTileMessage('');
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
    setSelectedVocabCard(next.vocabCards.find((card) => card.id === cardId) || null);
    if (getAuthToken()) {
      await syncLearningState()
        .then((state) => {
          setVocabCards(state.vocabCards);
          setSelectedVocabCard(state.vocabCards.find((card) => card.id === cardId) || null);
        })
        .catch(() => null);
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">统一管理</View>
        <View className="title">资产库</View>
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
        <Input
          value={query}
          onInput={(event) => setQuery(String(event.detail.value || ''))}
          placeholder="搜索中文、英文、表达或词卡"
          style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
        />
        <Button className="primary-button" loading={loading} disabled={loading} onClick={syncNow}>
          同步资产
        </Button>
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
                <Text>共 {filteredVocab.length} 张 · {dueVocabCount} 张待复习</Text>
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
                  {selectedVocabCard.nextDueAt && selectedVocabCard.nextDueAt <= new Date().toISOString() ? '待复习' : '词卡'}
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
              {selectedVocabCard.items.map((item) => (
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
              ))}
              {selectedVocabCard.items[0]?.sentence ? (
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
                    <View className="tile-prompt">提示中文：{selectedVocabCard.items[0].chinese}</View>
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
              <View className="review-action-row">
                <Button
                  className="primary-button review-action-button"
                  disabled={Boolean(selectedVocabCard.items[0]?.sentence) && !tilePassed}
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
              {selectedVocabCard.items[0]?.sentence ? (
                <Button className="secondary-button" onClick={() => copy(selectedVocabCard.items[0].sentence)}>复制例句</Button>
              ) : null}
              <Button className="danger-button" onClick={() => confirmDeleteVocabCard(selectedVocabCard)}>
                删除词卡
              </Button>
          </View>
        </View>
      ) : null}
      {selectedStuckPoint ? (
        <View className="modal-backdrop" onClick={() => setSelectedStuckPoint(null)}>
          <View className="modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="modal-header">
              <View>
                <View className="result-label">卡壳点</View>
                <View className="recommended-expression">{selectedStuckPoint.chineseThought}</View>
              </View>
              <Button className="modal-close" onClick={() => setSelectedStuckPoint(null)}>×</Button>
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
