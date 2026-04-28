import { Button, Input, Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';
import { syncLearningState, clearLearningState, getLearningState } from '../../features/learning/store';
import { loginWithPassword, loginWithWechat } from '../../platform/auth';
import { clearAuthState, getAuthToken, getUserProfile } from '../../platform/storage';

export default function ProfilePage() {
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'wechat' | 'password'>('wechat');
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

  async function handlePasswordLogin() {
    const normalizedEmail = email.trim();
    if (loading) return;
    if (!normalizedEmail || !password) {
      setMessage('请输入邮箱和密码。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await loginWithPassword(normalizedEmail, password);
      await syncLearningState().catch(() => null);
      refreshStatus();
      setMessage('账号密码登录成功，已同步学习数据。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '账号密码登录失败');
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
        <View className="title">{loggedIn ? '已登录' : '登录 VerbaLab'}</View>
        <View className="subtitle">
          可用微信绑定小程序账号，也可以直接用 Web 端邮箱密码登录；登录后同步语料、卡壳点和词卡。
        </View>
        {!loggedIn ? (
          <>
            <View className="segmented-control">
              <Button
                className={loginMode === 'wechat' ? 'segment-button active' : 'segment-button'}
                onClick={() => setLoginMode('wechat')}
              >
                微信绑定
              </Button>
              <Button
                className={loginMode === 'password' ? 'segment-button active' : 'segment-button'}
                onClick={() => setLoginMode('password')}
              >
                账号密码
              </Button>
            </View>
            {loginMode === 'wechat' ? (
              <Input
                value={inviteCode}
                onInput={(event) => setInviteCode(String(event.detail.value || ''))}
                placeholder="首次绑定请输入邀请码"
                style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
              />
            ) : (
              <>
                <Input
                  value={email}
                  onInput={(event) => setEmail(String(event.detail.value || ''))}
                  placeholder="邮箱"
                  style="margin-top: 24px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
                />
                <Input
                  value={password}
                  password
                  onInput={(event) => setPassword(String(event.detail.value || ''))}
                  placeholder="密码"
                  style="margin-top: 16px; box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #e4e7ec; border-radius: 18px; padding: 8px 14px; font-size: 14px; background: #fff;"
                />
              </>
            )}
          </>
        ) : null}
        <Button
          className="primary-button"
          loading={loading}
          disabled={loading}
          onClick={loggedIn ? handleSync : loginMode === 'wechat' ? handleLogin : handlePasswordLogin}
        >
          {loggedIn ? '立即同步' : loginMode === 'wechat' ? '微信登录 / 绑定' : '账号密码登录'}
        </Button>
        {loggedIn && getUserProfile()?.email ? <View className="meta-line">当前账号：{getUserProfile()?.email}</View> : null}
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
