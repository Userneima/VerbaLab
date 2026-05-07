import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { VERBALAB_WEB_URL } from '../../platform/config';

type QuotaPaywallProps = {
  visible: boolean;
  cost?: number;
  onClose: () => void;
};

const ADMIN_CONTACT_EMAIL = 'wyc1186164839@gmail.com';

export function QuotaPaywall({ visible, cost = 1, onClose }: QuotaPaywallProps) {
  if (!visible) return null;

  function copyAdminContact() {
    Taro.setClipboardData({
      data: ADMIN_CONTACT_EMAIL,
      success() {
        Taro.showToast({ title: '已复制管理员邮箱', icon: 'success' });
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
              你输入的内容会保留。可复制网页版链接去网页端处理额度，也可以联系管理员提升额度。网页版可能需要科学上网才能进入。
            </View>
          </View>
          <Button className="modal-close" onClick={onClose}>×</Button>
        </View>

        <View className="quota-plan-list">
          <View className="quota-plan-card">
            <View className="quota-plan-main">
              <View className="quota-plan-name-row">
                <Text className="quota-plan-name">去网页版增加额度</Text>
              </View>
              <View className="quota-plan-quota">verbalab-elis.vercel.app</View>
              <View className="quota-plan-note">复制链接后在浏览器打开。网页版可能需要科学上网才能进入。</View>
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
              <View className="quota-plan-quota">{ADMIN_CONTACT_EMAIL}</View>
              <View className="quota-plan-note">说明你的账号邮箱和使用场景，管理员会手动为账号加次数或开通内测额度。</View>
            </View>
            <Button className="quota-plan-button" onClick={copyAdminContact}>
              复制
            </Button>
          </View>
        </View>

        <View className="quota-trust-note">
          资产库、已保存内容、搜索、复制和基础复习永久免费。
        </View>
        <Button className="secondary-button" onClick={onClose}>先不用 AI 生成</Button>
      </View>
    </View>
  );
}
