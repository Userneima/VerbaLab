import { Button, Text, Textarea, View } from '@tarojs/components';
import { useState } from 'react';
import {
  generateExpressionGuide,
  type ExpressionGuide,
} from '../../features/expressionHelper/api';

export default function ExpressionHelperPage() {
  const [thought, setThought] = useState('');
  const [guide, setGuide] = useState<ExpressionGuide | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    const chineseThought = thought.trim();
    if (!chineseThought || loading) return;

    setLoading(true);
    setError('');
    setGuide(null);

    try {
      const result = await generateExpressionGuide(chineseThought);
      setGuide(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后再试');
    } finally {
      setLoading(false);
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
          style="margin-top: 24px; width: 100%; min-height: 180px; box-sizing: border-box; border-radius: 20px; border: 1px solid #e4e7ec; padding: 20px; background: #fff; font-size: 28px;"
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
              </View>
            ))
          ) : (
            <View className="empty-card">这次没有返回例句，可以换一种中文说法再试一次。</View>
          )}
        </View>
      ) : null}
    </View>
  );
}
