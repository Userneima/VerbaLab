import { Button, View } from '@tarojs/components';

export default function VocabReviewPage() {
  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">今天先看该看的</View>
        <View className="title">词卡复习</View>
        <View className="subtitle">
          小程序版优先展示待复习词卡，保留语体解析、例句和两个复习动作。
        </View>
        <Button className="primary-button">加载待复习词卡</Button>
      </View>
    </View>
  );
}
