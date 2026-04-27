import { Button, Text, Textarea, View } from '@tarojs/components';
import { useState } from 'react';

export default function ExpressionHelperPage() {
  const [thought, setThought] = useState('');

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
        <Button className="primary-button" disabled={!thought.trim()}>
          生成表达指导
        </Button>
      </View>
      <View className="placeholder-card">
        <Text>下一步接入小程序专用 AI request client，返回推荐表达、例句和保存到语料库入口。</Text>
      </View>
    </View>
  );
}
