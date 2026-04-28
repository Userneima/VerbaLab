import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  buildWeappVocabTags,
  generateVocabCard,
  mapGeneratedItems,
} from '../../features/vocabCard/api';
import {
  getLearningState,
  saveVocabCardToLocal,
  syncLearningState,
} from '../../features/learning/store';
import type { VocabCard } from '../../features/learning/types';
import { getAuthToken } from '../../platform/storage';

export default function VocabReviewPage() {
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [headword, setHeadword] = useState('');
  const [sense, setSense] = useState('');
  const [createdCard, setCreatedCard] = useState<VocabCard | null>(null);

  useEffect(() => {
    setMessage('');
  }, []);

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
      setCreatedCard(card);

      try {
        await syncLearningState();
        Taro.showModal({
          title: '词卡已创建',
          content: `“${card.headword}” 已保存到资产库。`,
          confirmText: '去资产库',
          cancelText: '继续创建',
          success(result) {
            if (result.confirm) Taro.switchTab({ url: '/pages/library/index' });
          },
        });
      } catch {
        Taro.showModal({
          title: '已保存到本地',
          content: `“${card.headword}” 已保存到本机。网络恢复后可在“我的”手动同步，或到资产库查看。`,
          confirmText: '去资产库',
          cancelText: '继续创建',
          success(result) {
            if (result.confirm) Taro.switchTab({ url: '/pages/library/index' });
          },
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

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">生产入口</View>
        <View className="title">词卡工坊</View>
        <View className="subtitle">
          输入一个单词或短语，生成语体解析、例句和目标搭配。保存后的词卡统一去“资产”里管理和复习。
        </View>
        <Input
          value={headword}
          onInput={(event) => setHeadword(String(event.detail.value || ''))}
          placeholder="输入单词或短语，例如 mirage"
          style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 30px; background: #fff;"
        />
        <Input
          value={sense}
          onInput={(event) => setSense(String(event.detail.value || ''))}
          placeholder="可选：限定词义，例如“泡影，不是海市蜃楼”"
          style="margin-top: 16px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 30px; background: #fff;"
        />
        <Button
          className="primary-button"
          loading={creating}
          disabled={!headword.trim() || creating}
          onClick={() => createCard()}
        >
          {creating ? '生成中...' : '生成并保存词卡'}
        </Button>
        {message ? (
          <View className={message.includes('失败') || message.includes('请先') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>
      <View className="placeholder-card">
        工坊只负责创建新内容；已保存的词卡、语料和卡壳点统一放到“资产”里搜索、复制和复习。
      </View>
      {createdCard ? (
        <View className="result-card">
          <View className="result-label">最近创建</View>
          <View className="recommended-expression">{createdCard.headword}</View>
          {createdCard.registerGuide?.anchorZh || createdCard.registerNoteZh ? (
            <View className="guidance-card">
              <Text>{createdCard.registerGuide?.anchorZh || createdCard.registerNoteZh}</Text>
            </View>
          ) : null}
          <Button className="secondary-button" onClick={() => Taro.switchTab({ url: '/pages/library/index' })}>
            去资产库查看
          </Button>
        </View>
      ) : null}
    </View>
  );
}
