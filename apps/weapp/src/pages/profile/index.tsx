import { Button, Input, Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';
import { syncLearningState, clearLearningState, getLearningState } from '../../features/learning/store';
import { loginWithWechat } from '../../platform/auth';
import { clearAuthState, getAuthToken, getUserProfile } from '../../platform/storage';

export default function ProfilePage() {
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();

  function refreshStatus() {
    setLoggedIn(Boolean(getAuthToken() && getUserProfile()));
    setLastSyncedAt(getLearningState().lastSyncedAt);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await loginWithWechat(inviteCode.trim() || undefined);
      if (result.needsInvite) {
        setMessage('首次使用需要邀请码。请输入邀请码后再绑定。');
        return;
      }
      await syncLearningState().catch(() => null);
      refreshStatus();
      setMessage(result.isNewUser ? '绑定成功，已为你创建小程序账号。' : '登录成功，已同步学习数据。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '微信登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (loading) return;
    if (!getAuthToken()) {
      setMessage('请先完成微信登录和邀请码绑定。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await syncLearningState();
      refreshStatus();
      setMessage('同步完成。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '同步失败');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuthState();
    refreshStatus();
    setMessage('已退出登录，本地学习内容仍保留。');
  }

  function handleClearLocal() {
    clearLearningState();
    refreshStatus();
    setMessage('已清理本地学习缓存。');
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="eyebrow">账号与同步</View>
        <View className="title">{loggedIn ? '已绑定微信账号' : '微信登录'}</View>
        <View className="subtitle">
          首次绑定需要邀请码；绑定后会自动同步语料、卡壳点和词卡复习状态。
        </View>
        {!loggedIn ? (
          <Input
            value={inviteCode}
            onInput={(event) => setInviteCode(String(event.detail.value || ''))}
            placeholder="首次绑定请输入邀请码"
            style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 72px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 12px 18px; font-size: 24px; background: #fff;"
          />
        ) : null}
        <Button className="primary-button" loading={loading} disabled={loading} onClick={loggedIn ? handleSync : handleLogin}>
          {loggedIn ? '立即同步' : '微信登录 / 绑定'}
        </Button>
        {lastSyncedAt ? <View className="meta-line">上次同步：{new Date(lastSyncedAt).toLocaleString()}</View> : null}
        {message ? (
          <View className={message.includes('失败') || message.includes('required') ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
        {loggedIn ? (
          <>
            <Button className="secondary-button" onClick={handleLogout}>退出登录</Button>
            <Button className="danger-button" onClick={handleClearLocal}>清理本地缓存</Button>
          </>
        ) : null}
      </View>
    </View>
  );
}
