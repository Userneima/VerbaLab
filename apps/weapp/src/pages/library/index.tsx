import { View } from '@tarojs/components';

export default function LibraryPage() {
  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">把会说的留下来</View>
        <View className="title">我的表达</View>
        <View className="subtitle">
          这里会汇总语料库和卡壳点，方便复制、搜索和再次练习。
        </View>
      </View>
    </View>
  );
}
