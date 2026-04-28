import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  buildWeappVocabTags,
  generateVocabCard,
  mapGeneratedItems,
} from '../../features/vocabCard/api';
import {
  getDueVocabCards,
  getLearningState,
  saveVocabCardToLocal,
  syncLearningState,
  updateVocabReview,
} from '../../features/learning/store';
import type { VocabCard } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

export default function VocabReviewPage() {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [headword, setHeadword] = useState('');
  const [sense, setSense] = useState('');

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

  function normalizeCardInput(value: string) {
    return value.trim().toLowerCase();
  }

  function findDuplicate(hw: string, se: string, vocabCards: VocabCard[]) {
    const normalizedHeadword = normalizeCardInput(hw);
    const normalizedSense = normalizeCardInput(se);
    return vocabCards.find(
      (card) =>
        normalizeCardInput(card.headword) === normalizedHeadword &&
        normalizeCardInput(card.sense || '') === normalizedSense
    );
  }

  async function createCard(forceDuplicate = false) {
    const hw = headword.trim();
    const se = sense.trim();
    if (!getAuthToken()) {
      Taro.showModal({
        title: '需要先登录',
        content: '请先到“我的”完成微信登录/邀请码绑定，或用 Web 端邮箱密码登录，再创建词卡。',
        confirmText: '去我的',
        success(result) {
          if (result.confirm) Taro.switchTab({ url: '/pages/profile/index' });
        },
      });
      return;
    }
    if (!hw || creating) return;

    setCreating(true);
    setMessage('');
    try {
      let current = getLearningState();
      try {
        current = await syncLearningState();
      } catch {
        // 允许离线创建本地词卡，但重复检测至少覆盖本地已有卡片。
      }

      const duplicate = findDuplicate(hw, se, current.vocabCards);
      if (duplicate && !forceDuplicate) {
        Taro.showModal({
          title: '已有这张词卡',
          content: '继续生成会再次消耗一次 AI 请求。是否仍然创建？',
          confirmText: '仍创建',
          cancelText: '取消',
          success(result) {
            if (result.confirm) void createCard(true);
          },
        });
        return;
      }

      const generated = await generateVocabCard(hw, se || undefined);
      const items = mapGeneratedItems(generated.items);
      if (items.length === 0) throw new Error('这次没有生成有效例句，请换个词再试。');

      const { card } = saveVocabCardToLocal({
        headword: hw,
        sense: se || undefined,
        tags: buildWeappVocabTags({
          headword: hw,
          isCommonInSpokenEnglish: generated.isCommonInSpokenEnglish,
          registerGuide: generated.registerGuide,
        }),
        items,
        spokenPracticePhrase: generated.spokenPracticePhrase,
        writtenSupplement: generated.writtenSupplement,
        registerNoteZh: generated.registerNoteZh,
        registerGuide: generated.registerGuide,
        spokenAlternatives: generated.spokenAlternatives,
        isCommonInSpokenEnglish: generated.isCommonInSpokenEnglish,
      });

      try {
        const next = await syncLearningState();
        setCards(getDueVocabCards(next.vocabCards));
        Taro.showToast({ title: '词卡已创建', icon: 'success' });
      } catch {
        refreshLocal();
        Taro.showModal({
          title: '已保存到本地',
          content: `“${card.headword}” 已保存到本机。网络恢复后可在“我的”手动同步。`,
          showCancel: false,
          confirmText: '知道了',
        });
      }
      setHeadword('');
      setSense('');
    } catch (err) {
      Taro.showModal({
        title: '创建失败',
        content: err instanceof Error ? err.message : '生成词卡失败，请稍后再试。',
        showCancel: false,
        confirmText: '知道了',
      });
    } finally {
      setCreating(false);
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
        <View className="eyebrow">创建和复习放在一起</View>
        <View className="title">单词卡片</View>
        <View className="subtitle">
          输入一个单词或短语，小程序会生成语体解析、例句和目标搭配；保存后和 Web 端词卡同步。
        </View>
        <Input
          value={headword}
          onInput={(event) => setHeadword(String(event.detail.value || ''))}
          placeholder="输入单词或短语，例如 mirage"
          style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 24px; background: #fff;"
        />
        <Input
          value={sense}
          onInput={(event) => setSense(String(event.detail.value || ''))}
          placeholder="可选：限定词义，例如“泡影，不是海市蜃楼”"
          style="margin-top: 16px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 24px; background: #fff;"
        />
        <Button
          className="primary-button"
          loading={creating}
          disabled={!headword.trim() || creating}
          onClick={() => createCard()}
        >
          {creating ? '生成中...' : '生成并保存词卡'}
        </Button>
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
