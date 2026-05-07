import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { VERBALAB_WEB_URL } from '../../platform/config';

type QuotaPaywallProps = {
  visible: boolean;
  cost?: number;
  onClose: () => void;
};

const ADMIN_WECHAT_ID = 'Mixwyc';

export function QuotaPaywall({ visible, cost = 1, onClose }: QuotaPaywallProps) {
  if (!visible) return null;

  function copyAdminWechat() {
    Taro.setClipboardData({
      data: ADMIN_WECHAT_ID,
      success() {
        Taro.showToast({ title: '已复制微信号', icon: 'success' });
      },
    });
  }

  function copyWebLink() {
    Taro.setClipboardData({
      data: VERBALAB_WEB_URL,
      success() {
        Taro.showToast({ title: '已复制网页版链接', icon: 'success' });
      },
    });
  }

  return (
    <View className="quota-sheet-backdrop">
      <View className="quota-sheet">
        <View className="quota-sheet-header">
          <View>
            <View className="quota-sheet-title">AI 生成次数不足</View>
            <View className="quota-sheet-subtitle">
              {cost > 1 ? `本次需要 ${cost} 次 AI 生成次数。` : ''}
              你输入的内容会保留。可以复制下面任一方式提升额度。
            </View>
          </View>
          <Button className="modal-close" onClick={onClose}>×</Button>
        </View>

        <View className="quota-plan-list">
          <View className="quota-plan-card">
            <View className="quota-plan-main">
              <View className="quota-plan-name-row">
                <Text className="quota-plan-name">推荐套餐</Text>
              </View>
              <View className="quota-plan-quota">月卡 2000 次/月 · 年卡 3000 次/月</View>
              <View className="quota-plan-note">适合每天练表达、收词卡；付款后管理员手动开通。</View>
            </View>
          </View>
          <View className="quota-plan-card">
            <View className="quota-plan-main">
              <View className="quota-plan-name-row">
                <Text className="quota-plan-name">去网页版增加额度</Text>
              </View>
              <View className="quota-plan-quota">{VERBALAB_WEB_URL}</View>
              <View className="quota-plan-note">可能需要科学上网。</View>
            </View>
            <Button className="quota-plan-button" onClick={copyWebLink}>
              复制
            </Button>
          </View>
          <View className="quota-plan-card">
            <View className="quota-plan-main">
              <View className="quota-plan-name-row">
                <Text className="quota-plan-name">联系管理员提升额度</Text>
              </View>
              <View className="quota-plan-quota">微信号：{ADMIN_WECHAT_ID}</View>
              <View className="quota-plan-note">付款后管理员会手动为当前账号加额度。</View>
            </View>
            <Button className="quota-plan-button" onClick={copyAdminWechat}>
              复制
            </Button>
          </View>
        </View>

        <Button className="secondary-button" onClick={onClose}>先不用 AI 生成</Button>
      </View>
    </View>
  );
}
