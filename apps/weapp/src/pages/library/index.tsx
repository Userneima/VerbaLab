import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  getDueVocabCards,
  getLearningState,
  syncLearningState,
  updateVocabReview,
} from '../../features/learning/store';
import type { CorpusEntry, StuckPointEntry, VocabCard } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

type AssetTab = 'expressions' | 'vocab' | 'stuck';
type VocabSortMode = 'due' | 'newest' | 'alphaAsc' | 'alphaDesc';

const VOCAB_SORT_LABELS: Record<VocabSortMode, string> = {
  due: '待复习优先',
  newest: '添加时间',
  alphaAsc: '首字母 A-Z',
  alphaDesc: '首字母 Z-A',
};

const VOCAB_SORT_OPTIONS: VocabSortMode[] = ['due', 'newest', 'alphaAsc', 'alphaDesc'];

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('expressions');
  const [corpus, setCorpus] = useState<CorpusEntry[]>([]);
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>([]);
  const [vocabCards, setVocabCards] = useState<VocabCard[]>([]);
  const [selectedVocabCard, setSelectedVocabCard] = useState<VocabCard | null>(null);
  const [vocabSortMode, setVocabSortMode] = useState<VocabSortMode>('due');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function refreshLocal() {
    const state = getLearningState();
    setCorpus(state.corpus);
    setStuckPoints(state.stuckPoints);
    setVocabCards(state.vocabCards);
  }

  useEffect(() => {
    refreshLocal();
  }, []);

  const filteredCorpus = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return corpus;
    return corpus.filter((item) =>
      [item.userSentence, item.zhTranslation, item.collocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [corpus, query]);

  const filteredStuck = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stuckPoints;
    return stuckPoints.filter((item) =>
      [item.chineseThought, item.englishAttempt, item.recommendedExpression]
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
    activeTab === 'expressions'
      ? '还没有语料。可以先去“表达”页生成并保存一句。'
      : activeTab === 'vocab'
        ? '还没有词卡。可以先去“工坊”生成一张。'
        : '还没有卡壳点。保存表达指导后会沉淀到这里。';

  async function syncNow() {
    if (!getAuthToken()) {
      setMessage('请先到“我的”完成微信登录和邀请码绑定，再同步表达。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const state = await syncLearningState();
      setCorpus(state.corpus);
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

  function copy(text: string) {
    wx.setClipboardData({ data: text });
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
          这里统一管理语料、词卡和卡壳点。生产入口负责生成，资产库负责搜索、复制和复习。
        </View>
        <View className="segmented-control">
          <Button
            className={activeTab === 'expressions' ? 'segment-button active' : 'segment-button'}
            onClick={() => setActiveTab('expressions')}
          >
            表达
          </Button>
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
          placeholder="搜索中文、英文、搭配或词卡"
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
      {activeTab === 'expressions' && filteredCorpus.length === 0 ? (
        <View className="placeholder-card">{placeholderText}</View>
      ) : null}
      {activeTab === 'vocab' && filteredVocab.length === 0 ? (
        <View className="placeholder-card">{placeholderText}</View>
      ) : null}
      {activeTab === 'stuck' && filteredStuck.length === 0 ? (
        <View className="placeholder-card">{placeholderText}</View>
      ) : null}
      {activeTab === 'expressions'
        ? filteredCorpus.map((item) => (
            <View className="result-card" key={item.id}>
              <View className="result-label">语料</View>
              <View className="example-sentence">{item.userSentence}</View>
              {item.zhTranslation ? <View className="example-chinese">{item.zhTranslation}</View> : null}
              {item.collocation ? <View className="chip-row"><View className="chip">{item.collocation}</View></View> : null}
              <Button className="secondary-button" onClick={() => copy(item.userSentence)}>复制英文</Button>
            </View>
          ))
        : null}
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
                <View className="vocab-compact-card" key={card.id} onClick={() => setSelectedVocabCard(card)}>
                  <View className="vocab-compact-main">
                    <View className="vocab-compact-headword">{card.headword}</View>
                    <View className="vocab-compact-brief">{getVocabBrief(card)}</View>
                  </View>
                  <View className="vocab-compact-meta">
                    <View className={card.__isDue ? 'vocab-status due' : 'vocab-status'}>{card.__isDue ? '待复习' : '词卡'}</View>
                    <View className="vocab-date">{formatDate(card.timestamp)}</View>
                  </View>
                </View>
              ))}
            </>
          )
        : null}
      {activeTab === 'stuck'
        ? filteredStuck.map((item) => (
            <View className="result-card" key={item.id}>
              <View className="result-label">卡壳点</View>
              <View className="recommended-expression">{item.chineseThought}</View>
              {item.recommendedExpression ? <View className="chip-row"><View className="chip">{item.recommendedExpression}</View></View> : null}
              {item.englishAttempt ? <View className="example-card"><View className="example-sentence">{item.englishAttempt}</View></View> : null}
              <Button className="secondary-button" onClick={() => copy(item.englishAttempt || item.recommendedExpression || item.chineseThought)}>复制</Button>
            </View>
          ))
        : null}
      {selectedVocabCard ? (
        <View className="modal-backdrop" onClick={() => setSelectedVocabCard(null)}>
          <View className="modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="modal-header">
              <View>
                <View className="result-label">
                  {selectedVocabCard.nextDueAt && selectedVocabCard.nextDueAt <= new Date().toISOString() ? '待复习' : '词卡'}
                </View>
                <View className="recommended-expression">{selectedVocabCard.headword}</View>
              </View>
              <Button className="modal-close" onClick={() => setSelectedVocabCard(null)}>×</Button>
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
              <Button className="primary-button" onClick={() => review(selectedVocabCard.id, 'remembered')}>记住了</Button>
              <Button className="secondary-button" onClick={() => review(selectedVocabCard.id, 'struggled')}>还不熟</Button>
              {selectedVocabCard.items[0]?.sentence ? (
                <Button className="secondary-button" onClick={() => copy(selectedVocabCard.items[0].sentence)}>复制例句</Button>
              ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
