import { Button, Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';
import {
  getDueVocabCards,
  getLearningState,
  syncLearningState,
  updateVocabReview,
} from '../../features/learning/store';
import type { VocabCard } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

export default function VocabReviewPage() {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function refreshLocal() {
    setCards(getDueVocabCards(getLearningState().vocabCards));
  }

  useEffect(() => {
    refreshLocal();
  }, []);

  async function loadCards() {
    if (!getAuthToken()) {
      setMessage('请先到“我的”完成微信登录和邀请码绑定，再加载词卡。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const state = await syncLearningState();
      setCards(getDueVocabCards(state.vocabCards));
      setMessage('词卡已同步。');
    } catch (err) {
      refreshLocal();
      setMessage(err instanceof Error ? err.message : '同步失败，已显示本地词卡。');
    } finally {
      setLoading(false);
    }
  }

  async function review(cardId: string, result: 'remembered' | 'struggled') {
    const next = updateVocabReview(cardId, result);
    setCards(getDueVocabCards(next.vocabCards));
    if (getAuthToken()) {
      await syncLearningState().catch(() => null);
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">今天先看该看的</View>
        <View className="title">词卡复习</View>
        <View className="subtitle">
          小程序版优先展示待复习词卡，保留语体解析、例句和两个复习动作。
        </View>
        <Button className="primary-button" loading={loading} disabled={loading} onClick={loadCards}>
          加载 / 同步词卡
        </Button>
        {message ? (
          <View className={message.includes('失败') || message.includes('请先') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>
      {cards.length === 0 ? (
        <View className="placeholder-card">还没有可复习的词卡。你可以先在 Web 端词卡工坊创建，或登录后同步。</View>
      ) : null}
      {cards.map((card) => (
        <View className="result-card" key={card.id}>
          <View className="result-label">{card.nextDueAt && card.nextDueAt <= new Date().toISOString() ? '待复习' : '最近词卡'}</View>
          <View className="recommended-expression">{card.headword}</View>
          {card.registerGuide?.anchorZh || card.registerNoteZh ? (
            <View className="guidance-card">
              <Text>{card.registerGuide?.anchorZh || card.registerNoteZh}</Text>
            </View>
          ) : null}
          {card.registerGuide?.coreCollocations?.length ? (
            <View className="chip-row">
              {card.registerGuide.coreCollocations.map((item) => (
                <View className="chip" key={item}>{item}</View>
              ))}
            </View>
          ) : null}
          {card.items.slice(0, 2).map((item) => (
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
          <Button className="primary-button" onClick={() => review(card.id, 'remembered')}>记住了</Button>
          <Button className="secondary-button" onClick={() => review(card.id, 'struggled')}>还不熟</Button>
        </View>
      ))}
    </View>
  );
}
