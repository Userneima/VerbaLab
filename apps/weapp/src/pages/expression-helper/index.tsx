import { Button, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import {
  generateExpressionGuide,
  type ExpressionGuide,
  type ExpressionGuideExample,
} from '../../features/expressionHelper/api';
import { saveExpressionToLocal, syncLearningState } from '../../features/learning/store';
import { getAuthToken } from '../../platform/storage';

export default function ExpressionHelperPage() {
  const [thought, setThought] = useState('');
  const [guide, setGuide] = useState<ExpressionGuide | null>(null);
  const [error, setError] = useState('');
  const [customSentence, setCustomSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    const chineseThought = thought.trim();
    if (!chineseThought || loading) return;

    setLoading(true);
    setError('');
    setGuide(null);

    try {
      const result = await generateExpressionGuide(chineseThought);
      setGuide(result);
      setCustomSentence(result.examples[0]?.sentence || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后再试');
    } finally {
      setLoading(false);
    }
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
      saveExpressionToLocal({
        chineseThought: thought.trim(),
        sentence,
        chinese: example?.chinese,
        noteZh: example?.noteZh,
        recommendedExpression: guide.recommendedExpression,
        guidanceZh: guide.guidanceZh || guide.suggestion,
      });
      try {
        await syncLearningState();
        Taro.showToast({
          title: '已保存到语料库',
          icon: 'success',
        });
      } catch {
        Taro.showModal({
          title: '已保存到本地',
          content: '这句话已经保存在本机。网络恢复后，可以在“我的”页面手动同步到云端。',
          showCancel: false,
          confirmText: '知道了',
        });
      }
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

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">先把中文放进来</View>
        <View className="title">想说但不会说</View>
        <View className="subtitle">
          输入你脑子里的中文，AI 会给出更自然的英文表达方向和例句。
        </View>
        <Textarea
          value={thought}
          onInput={(event) => setThought(String(event.detail.value || ''))}
          placeholder="例如：我们不是一路人 / 我想委婉拒绝 / 我有点被这个项目压住了"
          maxlength={300}
          style="margin-top: 24px; width: 100%; min-height: 180px; box-sizing: border-box; border-radius: 20px; border: 1px solid #e4e7ec; padding: 20px; background: #fff; font-size: 30px;"
        />
        <Button
          className="primary-button"
          disabled={!thought.trim() || loading}
          loading={loading}
          onClick={handleGenerate}
        >
          {loading ? '生成中...' : '生成表达指导'}
        </Button>
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
            value={customSentence}
            onInput={(event) => setCustomSentence(String(event.detail.value || ''))}
            placeholder="可以把上面的例句改成更像你自己的句子"
            maxlength={500}
            style="margin-top: 16px; width: 100%; min-height: 140px; box-sizing: border-box; border-radius: 18px; border: 1px solid #e4e7ec; padding: 18px; background: #fff; font-size: 30px;"
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
    </View>
  );
}
