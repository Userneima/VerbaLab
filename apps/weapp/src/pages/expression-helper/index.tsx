import { Button, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  generateExpressionGuide,
  generateExpressionInspirations,
  type ExpressionGuide,
  type ExpressionGuideExample,
  type ExpressionInspiration,
} from '../../features/expressionHelper/api';
import { saveExpressionToLocal, syncLearningState } from '../../features/learning/store';
import { getAuthToken, setAssetOpenIntent } from '../../platform/storage';
import { QuotaPaywall } from '../../features/aiQuota/QuotaPaywall';
import {
  AI_QUOTA_COST,
  consumeAiQuota,
  getAiQuotaSummary,
  getLatestAiQuotaSummary,
  getQuotaHintFromSummary,
  hasEnoughAiQuotaInSummary,
  isQuotaExhaustedError,
  type AiQuotaSummary,
} from '../../features/aiQuota/store';

export default function ExpressionHelperPage() {
  const [thought, setThought] = useState('');
  const [inspirationContext, setInspirationContext] = useState('');
  const [inspirationOpen, setInspirationOpen] = useState(false);
  const [inspirations, setInspirations] = useState<ExpressionInspiration[]>([]);
  const [guide, setGuide] = useState<ExpressionGuide | null>(null);
  const [error, setError] = useState('');
  const [customSentence, setCustomSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotaSummary, setQuotaSummary] = useState<AiQuotaSummary>(() => getAiQuotaSummary());
  const [paywallCost, setPaywallCost] = useState(1);
  const [paywallVisible, setPaywallVisible] = useState(false);

  async function refreshQuota() {
    setQuotaSummary(getAiQuotaSummary());
    const latest = await getLatestAiQuotaSummary();
    setQuotaSummary(latest);
  }

  function ensureQuota(cost: number) {
    if (hasEnoughAiQuotaInSummary(quotaSummary, cost)) return true;
    setPaywallCost(cost);
    setPaywallVisible(true);
    return false;
  }

  useEffect(() => {
    void refreshQuota();
  }, []);

  async function handleGenerateInspirations() {
    const contextZh = inspirationContext.trim();
    if (!contextZh || inspirationLoading) return;
    if (!ensureQuota(AI_QUOTA_COST.expression_inspiration)) return;

    setInspirationLoading(true);
    setError('');
    setInspirations([]);

    try {
      const result = await generateExpressionInspirations(contextZh);
      if (getAuthToken()) {
        await refreshQuota();
      } else {
        setQuotaSummary(consumeAiQuota('expression_inspiration', AI_QUOTA_COST.expression_inspiration));
      }
      setInspirations(result.inspirations || []);
    } catch (err) {
      if (isQuotaExhaustedError(err)) {
        setPaywallCost(AI_QUOTA_COST.expression_inspiration);
        setPaywallVisible(true);
      }
      setError(err instanceof Error ? err.message : '生成灵感失败，请稍后再试');
    } finally {
      setInspirationLoading(false);
    }
  }

  function useInspiration(inspiration: ExpressionInspiration) {
    setThought(inspiration.chineseThought);
    setGuide(null);
    setCustomSentence('');
    setError('');
    setInspirationOpen(false);
  }

  async function handleGenerate() {
    const chineseThought = thought.trim();
    if (!chineseThought || loading) return;
    if (!ensureQuota(AI_QUOTA_COST.expression_guide)) return;

    setLoading(true);
    setError('');
    setGuide(null);

    try {
      const result = await generateExpressionGuide(chineseThought);
      if (getAuthToken()) {
        await refreshQuota();
      } else {
        setQuotaSummary(consumeAiQuota('expression_guide', AI_QUOTA_COST.expression_guide));
      }
      setGuide(result);
      setCustomSentence(result.examples[0]?.sentence || '');
    } catch (err) {
      if (isQuotaExhaustedError(err)) {
        setPaywallCost(AI_QUOTA_COST.expression_guide);
        setPaywallVisible(true);
      }
      setError(err instanceof Error ? err.message : '生成失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  function resetExpressionWorkspace() {
    setThought('');
    setGuide(null);
    setCustomSentence('');
    setInspirationContext('');
    setInspirationOpen(false);
    setInspirations([]);
    setError('');
  }

  async function saveSentence(example?: ExpressionGuideExample) {
    const sentence = (example?.sentence || customSentence).trim();
    if (!guide || !thought.trim() || !sentence || saving) return;
    if (!getAuthToken()) {
      Taro.showModal({
        title: '需要先登录',
        content: '请先到“我的”完成微信登录和邀请码绑定，再保存到语料库。',
        confirmText: '去我的',
        success: (result) => {
          if (result.confirm) {
            Taro.switchTab({ url: '/pages/profile/index' });
          }
        },
      });
      return;
    }

    setSaving(true);
    setError('');
    try {
      const nextState = saveExpressionToLocal({
        chineseThought: thought.trim(),
        sentence,
        chinese: example?.chinese,
        noteZh: example?.noteZh,
        recommendedExpression: guide.recommendedExpression,
        guidanceZh: guide.guidanceZh || guide.suggestion,
      });
      const savedStuckPointId = nextState.stuckPoints[0]?.id;
      setAssetOpenIntent({
        tab: 'stuck',
        itemId: savedStuckPointId,
        createdAt: new Date().toISOString(),
      });
      resetExpressionWorkspace();
      try {
        await syncLearningState();
        Taro.showToast({
          title: '已保存到资产',
          icon: 'success',
        });
      } catch {
        Taro.showToast({
          title: '已保存到本机',
          icon: 'none',
        });
      }
      Taro.switchTab({ url: '/pages/library/index' });
    } catch (err) {
      Taro.showModal({
        title: '保存失败',
        content: err instanceof Error ? err.message : '这次没有保存成功，请稍后再试。',
        showCancel: false,
        confirmText: '知道了',
      });
    } finally {
      setSaving(false);
    }
  }

  const isGenerateDisabled = !thought.trim() || loading;
  const isInspirationDisabled = !inspirationContext.trim() || inspirationLoading;
  const expressionQuotaHint = getQuotaHintFromSummary(quotaSummary, AI_QUOTA_COST.expression_guide);
  const inspirationQuotaHint = getQuotaHintFromSummary(quotaSummary, AI_QUOTA_COST.expression_inspiration);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">先把中文放进来</View>
        <View className="title">想说但不会说</View>
        <View className="subtitle">
          输入你脑子里的中文，AI 会给出更自然的英文表达方向和例句。
        </View>
        <Textarea
          className="compact-textarea expression-input"
          value={thought}
          onInput={(event) => setThought(String(event.detail.value || ''))}
          placeholder="例如：我们不是一路人 / 我想委婉拒绝 / 我有点被这个项目压住了"
          placeholderStyle="color: #98a2b3; font-size: 14px; line-height: 1.45;"
          maxlength={300}
          autoHeight
        />
        <Button
          className="primary-button"
          disabled={isGenerateDisabled}
          loading={loading}
          onClick={handleGenerate}
        >
          {loading ? '生成中...' : '生成表达指导'}
        </Button>
        <View className={quotaSummary.totalRemaining <= 3 ? 'quota-inline-hint warning' : 'quota-inline-hint'}>
          {expressionQuotaHint}
        </View>
      </View>
      {error ? (
        <View className="error-card">
          <Text>{error}</Text>
        </View>
      ) : null}
      {guide ? (
        <View className="result-card">
          <View className="result-label">推荐表达</View>
          <View className="recommended-expression">
            {guide.recommendedExpression || guide.suggestion}
          </View>
          {guide.guidanceZh || guide.suggestion ? (
            <View className="guidance-card">
              <Text>{guide.guidanceZh || guide.suggestion}</Text>
            </View>
          ) : null}
          <View className="result-section-title">可以直接拿来用的例句</View>
          {guide.examples.length > 0 ? (
            guide.examples.map((example, index) => (
              <View className="example-card" key={`${example.sentence}-${index}`}>
                <View className="example-sentence">{example.sentence}</View>
                {example.chinese ? <View className="example-chinese">{example.chinese}</View> : null}
                {example.noteZh ? <View className="example-note">{example.noteZh}</View> : null}
                <Button
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => saveSentence(example)}
                >
                  收进语料库
                </Button>
              </View>
            ))
          ) : (
            <View className="empty-card">这次没有返回例句，可以换一种中文说法再试一次。</View>
          )}
          <View className="result-section-title">改成自己的说法</View>
          <Textarea
            className="compact-textarea custom-sentence-input"
            value={customSentence}
            onInput={(event) => setCustomSentence(String(event.detail.value || ''))}
            placeholder="可以把上面的例句改成更像你自己的句子"
            placeholderStyle="color: #98a2b3; font-size: 14px; line-height: 1.45;"
            maxlength={500}
            autoHeight
          />
          <Button
            className="primary-button"
            disabled={!customSentence.trim() || saving}
            loading={saving}
            onClick={() => saveSentence()}
          >
            {saving ? '保存中...' : '保存我的句子'}
          </Button>
        </View>
      ) : null}
      {!inspirationOpen ? (
        <View className="helper-collapsed-card" onClick={() => setInspirationOpen(true)}>
          <View className="helper-collapsed-copy">
            <View className="eyebrow compact-eyebrow">不知道说什么？</View>
            <View className="helper-collapsed-title">写下最近在忙什么，让 AI 拆几个可练的中文想法。</View>
          </View>
          <Button className="toolbar-button helper-toggle-button" onClick={() => setInspirationOpen(true)}>
            展开
          </Button>
        </View>
      ) : (
        <View className="hero-card secondary-hero-card helper-expanded-card">
          <View className="helper-section-header">
            <View>
              <View className="eyebrow">不知道说什么？</View>
              <View className="title compact-title">先从最近在忙什么开始</View>
            </View>
            <Button className="toolbar-button helper-toggle-button" onClick={() => setInspirationOpen(false)}>
              收起
            </Button>
          </View>
          <View className="subtitle">
            写下你最近在忙什么，AI 会帮你拆成几句可以练的中文表达。
          </View>
          <Textarea
            className="compact-textarea helper-input"
            value={inspirationContext}
            onInput={(event) => setInspirationContext(String(event.detail.value || ''))}
            placeholder="例如：最近在准备面试 / 项目很多有点忙 / 在学一个新技能"
            placeholderStyle="color: #98a2b3; font-size: 14px; line-height: 1.45;"
            maxlength={240}
            autoHeight
          />
          <Button
            className="primary-button"
            disabled={isInspirationDisabled}
            loading={inspirationLoading}
            onClick={handleGenerateInspirations}
          >
            {inspirationLoading ? '分析中...' : '给我几个可说的想法'}
          </Button>
          <View className={quotaSummary.totalRemaining <= 3 ? 'quota-inline-hint warning' : 'quota-inline-hint'}>
            {inspirationQuotaHint}
          </View>
          {inspirations.length > 0 ? (
            <View className="chip-row">
              {inspirations.map((item, index) => (
                <Button
                  className="inspiration-chip"
                  key={`${item.chineseThought}-${index}`}
                  onClick={() => useInspiration(item)}
                >
                  {item.chineseThought}
                </Button>
              ))}
            </View>
          ) : null}
        </View>
      )}
      <QuotaPaywall
        visible={paywallVisible}
        cost={paywallCost}
        onClose={() => setPaywallVisible(false)}
      />
    </View>
  );
}
