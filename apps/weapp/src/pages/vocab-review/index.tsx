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
import { QuotaPaywall } from '../../features/aiQuota/QuotaPaywall';
import {
  AI_QUOTA_COST,
  getAiQuotaSummary,
  getLatestAiQuotaSummary,
  getQuotaHintFromSummary,
  hasEnoughAiQuotaInSummary,
  isQuotaExhaustedError,
  type AiQuotaSummary,
} from '../../features/aiQuota/store';

type VocabCardPreviewDraft = {
  headword: string;
  sense?: string;
  tags: string[];
  items: ReturnType<typeof mapGeneratedItems>;
  spokenPracticePhrase?: string;
  writtenSupplement?: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCard['registerGuide'];
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
};

export default function VocabReviewPage() {
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingPreview, setSavingPreview] = useState(false);
  const [headword, setHeadword] = useState('');
  const [sense, setSense] = useState('');
  const [createdCard, setCreatedCard] = useState<VocabCard | null>(null);
  const [previewDraft, setPreviewDraft] = useState<VocabCardPreviewDraft | null>(null);
  const [quotaSummary, setQuotaSummary] = useState<AiQuotaSummary>(() => getAiQuotaSummary());
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    setMessage('');
    void refreshQuota();
  }, []);

  async function refreshQuota() {
    setQuotaSummary(getAiQuotaSummary());
    const latest = await getLatestAiQuotaSummary();
    setQuotaSummary(latest);
  }

  function ensureVocabQuota() {
    if (hasEnoughAiQuotaInSummary(quotaSummary, AI_QUOTA_COST.vocab_card)) return true;
    setPaywallVisible(true);
    return false;
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

  function handleHeadwordInput(value: string) {
    setHeadword(value);
    setPreviewDraft(null);
    setCreatedCard(null);
    setMessage('');
  }

  function handleSenseInput(value: string) {
    setSense(value);
    setPreviewDraft(null);
    setCreatedCard(null);
    setMessage('');
  }

  async function createPreview(forceDuplicate = false) {
    const hw = headword.trim();
    const se = sense.trim();
    if (!getAuthToken()) {
      Taro.showModal({
        title: '需要先登录',
        content: '请先到“我的”完成微信登录/邀请码绑定，或用 Web 端邮箱密码登录，再生成词卡。',
        confirmText: '去我的',
        success(result) {
          if (result.confirm) Taro.switchTab({ url: '/pages/profile/index' });
        },
      });
      return;
    }
    if (!hw || creating) return;
    if (!ensureVocabQuota()) return;

    setCreating(true);
    setMessage('');
    setPreviewDraft(null);
    setCreatedCard(null);
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
          content: '继续生成会再次消耗一次 AI 请求。是否仍然生成新的预览？',
          confirmText: '生成预览',
          cancelText: '取消',
          success(result) {
            if (result.confirm) void createPreview(true);
          },
        });
        return;
      }

      const generated = await generateVocabCard(hw, se || undefined);
      const items = mapGeneratedItems(generated.items);
      if (items.length === 0) throw new Error('这次没有生成有效例句，请换个词再试。');
      await refreshQuota();

      setPreviewDraft({
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
      setMessage('词卡预览已生成，确认有用后再收录到资产库。');
    } catch (err) {
      if (isQuotaExhaustedError(err)) {
        setPaywallVisible(true);
      }
      Taro.showModal({
        title: '生成失败',
        content: err instanceof Error ? err.message : '生成词卡失败，请稍后再试。',
        showCancel: false,
        confirmText: '知道了',
      });
    } finally {
      setCreating(false);
    }
  }

  async function savePreviewToAssets() {
    if (!previewDraft || savingPreview) return;
    if (!getAuthToken()) {
      Taro.showModal({
        title: '需要先登录',
        content: '请先到“我的”完成登录，再把词卡收录到资产库。',
        confirmText: '去我的',
        success(result) {
          if (result.confirm) Taro.switchTab({ url: '/pages/profile/index' });
        },
      });
      return;
    }

    setSavingPreview(true);
    setMessage('');
    try {
      const { card } = saveVocabCardToLocal({
        headword: previewDraft.headword,
        sense: previewDraft.sense,
        tags: previewDraft.tags,
        items: previewDraft.items,
        spokenPracticePhrase: previewDraft.spokenPracticePhrase,
        writtenSupplement: previewDraft.writtenSupplement,
        registerNoteZh: previewDraft.registerNoteZh,
        registerGuide: previewDraft.registerGuide,
        spokenAlternatives: previewDraft.spokenAlternatives,
        isCommonInSpokenEnglish: previewDraft.isCommonInSpokenEnglish,
      });
      setCreatedCard(card);
      setPreviewDraft(null);

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
        title: '收录失败',
        content: err instanceof Error ? err.message : '这次没有保存成功，请稍后再试。',
        showCancel: false,
        confirmText: '知道了',
      });
    } finally {
      setSavingPreview(false);
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">生产入口</View>
        <View className="title">词卡工坊</View>
        <View className="subtitle">
          输入一个单词或短语，先生成词卡预览；确认有用后再收录到资产库。
        </View>
        <Input
          value={headword}
          onInput={(event) => handleHeadwordInput(String(event.detail.value || ''))}
          placeholder="输入单词或短语，例如 mirage"
          style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
        />
        <Input
          value={sense}
          onInput={(event) => handleSenseInput(String(event.detail.value || ''))}
          placeholder="可选：限定词义，例如“泡影，不是海市蜃楼”"
          style="margin-top: 16px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
        />
        <Button
          className="primary-button"
          loading={creating}
          disabled={!headword.trim() || creating}
          onClick={() => createPreview()}
        >
          {creating ? '生成中...' : '生成词卡预览'}
        </Button>
        <View className={quotaSummary.totalRemaining <= 3 ? 'quota-inline-hint warning' : 'quota-inline-hint'}>
          词卡生成消耗 3 次。{getQuotaHintFromSummary(quotaSummary, AI_QUOTA_COST.vocab_card)}
        </View>
        {message ? (
          <View className={message.includes('失败') || message.includes('请先') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>
      <View className="placeholder-card">
        预览不会自动进入资产库。只有点“收录到资产库”后，词卡才会参与复习。
      </View>
      {previewDraft ? (
        <View className="result-card">
          <View className="result-label">待收录预览</View>
          <View className="recommended-expression">{previewDraft.headword}</View>
          {previewDraft.registerGuide?.anchorZh || previewDraft.registerNoteZh ? (
            <View className="guidance-card">
              <Text>{previewDraft.registerGuide?.anchorZh || previewDraft.registerNoteZh}</Text>
            </View>
          ) : null}
          {previewDraft.tags.length ? (
            <View className="chip-row">
              {previewDraft.tags.map((tag) => (
                <View className="chip" key={tag}>{tag}</View>
              ))}
            </View>
          ) : null}
          {previewDraft.registerGuide?.alternatives?.length ? (
            <View className="guidance-card">
              {previewDraft.registerGuide.alternatives.slice(0, 3).map((item) => (
                <View key={`${item.labelZh}-${item.phrase}`}>
                  <Text>
                    {item.labelZh} · {item.phrase}
                    {item.usageZh ? `：${item.usageZh}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {previewDraft.registerGuide?.coreCollocations?.length ? (
            <View className="chip-row">
              {previewDraft.registerGuide.coreCollocations.map((phrase) => (
                <View className="chip" key={phrase}>{phrase}</View>
              ))}
            </View>
          ) : null}
          {previewDraft.items.slice(0, 2).map((item) => (
            <View className="example-card" key={item.sentence}>
              <View className="example-sentence">{item.sentence}</View>
              {item.chinese ? <View className="example-chinese">{item.chinese}</View> : null}
              {item.collocationsUsed.length ? (
                <View className="chip-row">
                  {item.collocationsUsed.map((phrase) => (
                    <View className="chip" key={phrase}>{phrase}</View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          <Button
            className="primary-button"
            loading={savingPreview}
            disabled={savingPreview}
            onClick={savePreviewToAssets}
          >
            {savingPreview ? '收录中...' : '收录到资产库'}
          </Button>
          <Button
            className="secondary-button"
            disabled={creating || savingPreview}
            onClick={() => createPreview(true)}
          >
            重新生成
          </Button>
          <Button
            className="secondary-button"
            disabled={creating || savingPreview}
            onClick={() => {
              setPreviewDraft(null);
              setMessage('已取消这次预览，没有写入资产库。');
            }}
          >
            暂不收录
          </Button>
        </View>
      ) : null}
      {createdCard ? (
        <View className="result-card">
          <View className="result-label">已收录</View>
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
      <QuotaPaywall
        visible={paywallVisible}
        cost={AI_QUOTA_COST.vocab_card}
        onClose={() => setPaywallVisible(false)}
      />
    </View>
  );
}
