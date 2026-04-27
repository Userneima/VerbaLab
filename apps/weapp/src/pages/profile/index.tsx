import { Button, View } from '@tarojs/components';

export default function ProfilePage() {
  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">账号与同步</View>
        <View className="title">微信登录</View>
        <View className="subtitle">
          小程序端会使用 wx.login 绑定 VerbaLab 账号，首次绑定仍需要邀请码。
        </View>
        <Button className="primary-button">微信登录 / 绑定</Button>
      </View>
    </View>
  );
}
