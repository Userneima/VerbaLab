import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { syncLearningState, clearLearningState, getLearningState } from '../../features/learning/store';
import type { LearningState } from '../../features/learning/types';
import { loginWithPassword, loginWithWechat } from '../../platform/auth';
import { clearAuthState, getAuthToken, getUserProfile, type WeappUserProfile } from '../../platform/storage';
import { getAiQuotaSummary, getLatestAiQuotaSummary, type AiQuotaSummary } from '../../features/aiQuota/store';
import { VERBALAB_WEB_URL } from '../../platform/config';

const ADMIN_CONTACT_EMAIL = 'wyc1186164839@gmail.com';

type AssetStats = {
  corpusCount: number;
  stuckCount: number;
  vocabCount: number;
  dueVocabCount: number;
  totalCount: number;
};

function getDueVocabCount(state: LearningState): number {
  const now = new Date().toISOString();
  return state.vocabCards.filter((card) => card.nextDueAt && card.nextDueAt <= now).length;
}

function buildAssetStats(state: LearningState): AssetStats {
  return {
    corpusCount: state.corpus.length,
    stuckCount: state.stuckPoints.length,
    vocabCount: state.vocabCards.length,
    dueVocabCount: getDueVocabCount(state),
    totalCount: state.corpus.length + state.stuckPoints.length + state.vocabCards.length,
  };
}

function getProviderLabel(provider?: WeappUserProfile['provider']): string {
  if (provider === 'wechat') return '微信绑定';
  if (provider === 'password') return '账号密码';
  return '已登录';
}

function getAccountDisplay(profile: WeappUserProfile | null): string {
  if (!profile) return '未登录';
  if (profile.email) return profile.email;
  const id = profile.userId || '';
  if (id.length <= 12) return id || '小程序账号';
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function formatFriendlyTime(value?: string): string {
  if (!value) return '暂无记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无记录';

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `今天 ${time}`;
  if (isTomorrow) return `明天 ${time}`;
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfilePage() {
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'wechat' | 'password'>('wechat');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<WeappUserProfile | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [assetStats, setAssetStats] = useState<AssetStats>(() => buildAssetStats(getLearningState()));
  const [quotaSummary, setQuotaSummary] = useState<AiQuotaSummary>(() => getAiQuotaSummary());
  const [showQuotaLedger, setShowQuotaLedger] = useState(false);

  function isErrorMessage(value: string): boolean {
    return /失败|错误|不正确|无效|invalid|required|too many|过多|未完成|没有完成/.test(value.toLowerCase());
  }

  function refreshStatus() {
    const currentProfile = getUserProfile();
    const learningState = getLearningState();
    setProfile(currentProfile);
    setLoggedIn(Boolean(getAuthToken() && currentProfile));
    setLastSyncedAt(learningState.lastSyncedAt);
    setAssetStats(buildAssetStats(learningState));
    setQuotaSummary(getAiQuotaSummary());
  }

  async function refreshRemoteQuota() {
    const latest = await getLatestAiQuotaSummary();
    setQuotaSummary(latest);
  }

  useEffect(() => {
    refreshStatus();
    void refreshRemoteQuota();
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
      await refreshRemoteQuota().catch(() => null);
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
      await refreshRemoteQuota().catch(() => null);
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
      setMessage('请先完成登录，再同步学习资产。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await syncLearningState();
      refreshStatus();
      await refreshRemoteQuota().catch(() => null);
      setMessage('同步完成。');
    } catch (err) {
      const detail = err instanceof Error ? ` ${err.message}` : '';
      setMessage(`同步失败。本地内容还在，只是暂时没同步到云端。${detail}`);
    } finally {
      setLoading(false);
    }
  }

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

  function openQuotaHelpSheet() {
    Taro.showActionSheet({
      itemList: ['复制网页版链接', '复制管理员邮箱'],
      success(result) {
        if (result.tapIndex === 0) {
          copyWebLink();
          return;
        }
        copyAdminContact();
      },
    });
  }

  function handleLogout() {
    clearAuthState();
    refreshStatus();
    setMessage('已退出登录，本地学习内容仍保留。');
  }

  function handleClearLocal() {
    Taro.showModal({
      title: '清理本地缓存？',
      content: '这只会清理本机里的语料、卡壳点和词卡，不会删除云端账号。确认后本机内容会变为空。',
      confirmText: '清理本机',
      cancelText: '取消',
      success(result) {
        if (!result.confirm) return;
        clearLearningState();
        refreshStatus();
        setMessage('已清理本地学习缓存。');
      },
    });
  }

  const accountDisplay = getAccountDisplay(profile);
  const hasLocalAssets = assetStats.totalCount > 0;
  const quotaPrimaryLine =
    quotaSummary.planType === 'free'
      ? `免费总额度还剩 ${quotaSummary.extraRemaining} 次`
      : `本月还剩 ${quotaSummary.planMonthlyRemaining} / ${quotaSummary.planMonthlyLimit}`;
  const quotaSecondaryLine =
    quotaSummary.extraRemaining > 0 ? `额外可用 ${quotaSummary.extraRemaining} 次` : '资产库、搜索、复制和复习永久免费';

  return (
    <View className="page-shell">
      <View className="hero-card">
        <View className="profile-identity-row">
          <View className="profile-avatar">{loggedIn ? accountDisplay.slice(0, 1).toUpperCase() : 'VL'}</View>
          <View className="profile-identity-main">
            <View className="eyebrow">账号中控台</View>
            <View className="title">{loggedIn ? '已连接 VerbaLab' : '登录 VerbaLab'}</View>
            <View className="subtitle">
              {loggedIn
                ? '你的语料、卡壳点和词卡会保存在本机，登录后可同步到云端。'
                : '登录后同步语料、卡壳点和词卡；不登录也可以先在本机练习。'}
            </View>
          </View>
        </View>

        {loggedIn ? (
          <View className="profile-account-card">
            <View className="profile-account-row">
              <Text className="profile-account-label">登录方式</Text>
              <Text className="profile-account-value">{getProviderLabel(profile?.provider)}</Text>
            </View>
            <View className="profile-account-row">
              <Text className="profile-account-label">当前账号</Text>
              <Text className="profile-account-value">{accountDisplay}</Text>
            </View>
            <View className="profile-account-row">
              <Text className="profile-account-label">账号状态</Text>
              <Text className="profile-account-value">已连接云端</Text>
            </View>
            <View className="profile-account-row">
              <Text className="profile-account-label">会话有效至</Text>
              <Text className="profile-account-value">{formatFriendlyTime(profile?.expiresAt)}</Text>
            </View>
          </View>
        ) : (
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
            <Button
              className="primary-button"
              loading={loading}
              disabled={loading}
              onClick={loginMode === 'wechat' ? handleLogin : handlePasswordLogin}
            >
              {loginMode === 'wechat' ? '微信登录 / 绑定' : '账号密码登录'}
            </Button>
          </>
        )}

        {message ? (
          <View className={isErrorMessage(message) ? 'error-card' : 'success-card'}>
            <Text>{message}</Text>
          </View>
        ) : null}
      </View>

      <View className="result-card">
        <View className="result-label">AI 生成次数</View>
        <View className="quota-status-card">
          <View className="quota-status-main">
            <View className="quota-status-number">{quotaSummary.totalRemaining}</View>
            <View className="quota-status-copy">
              <View className="quota-status-title">当前可用次数</View>
              <View className="quota-status-subtitle">{quotaPrimaryLine}</View>
              <View className="quota-status-subtitle">{quotaSecondaryLine}</View>
            </View>
          </View>
          <View className="quota-plan-pill">{quotaSummary.planLabel}</View>
        </View>
        {!loggedIn ? (
          <View className="meta-line">登录后可同步 AI 生成次数。本地资产不会因为未登录而丢失。</View>
        ) : (
          <View className="meta-line">表达指导和灵感生成消耗 1 次，词卡生成消耗 3 次。</View>
        )}
        <Button
          className="secondary-button"
          onClick={openQuotaHelpSheet}
        >
          申请提升额度
        </Button>
        <View className="meta-line">
          网页版入口可用于处理额度；复制链接后在浏览器打开，可能需要科学上网才能进入。
        </View>
        <Button className="secondary-button" onClick={() => setShowQuotaLedger(!showQuotaLedger)}>
          {showQuotaLedger ? '收起使用明细' : '查看使用明细'}
        </Button>
        {showQuotaLedger ? (
          <View className="quota-ledger-list">
            {quotaSummary.ledger.length ? (
              quotaSummary.ledger.slice(0, 8).map((event) => (
                <View className="quota-ledger-row" key={event.id}>
                  <View>
                    <View className="quota-ledger-label">{event.label}</View>
                    <View className="quota-ledger-time">{formatFriendlyTime(event.createdAt)}</View>
                  </View>
                  <View className={event.delta > 0 ? 'quota-ledger-delta positive' : 'quota-ledger-delta'}>
                    {event.delta > 0 ? `+${event.delta}` : event.delta}
                  </View>
                </View>
              ))
            ) : (
              <View className="empty-card">还没有 AI 生成次数明细。</View>
            )}
          </View>
        ) : null}
      </View>

      <View className="result-card">
        <View className="result-label">学习资产概览</View>
        <View className="profile-stat-grid">
          <View className="profile-stat-card">
            <View className="profile-stat-value">{assetStats.corpusCount}</View>
            <View className="profile-stat-label">语料</View>
          </View>
          <View className="profile-stat-card">
            <View className="profile-stat-value">{assetStats.stuckCount}</View>
            <View className="profile-stat-label">卡壳点</View>
          </View>
          <View className="profile-stat-card">
            <View className="profile-stat-value">{assetStats.vocabCount}</View>
            <View className="profile-stat-label">词卡</View>
          </View>
          <View className="profile-stat-card">
            <View className="profile-stat-value">{assetStats.dueVocabCount}</View>
            <View className="profile-stat-label">待复习</View>
          </View>
        </View>
        <View className="meta-line">
          {hasLocalAssets ? '这些内容保存在本机；登录后可以同步到云端。' : '还没有沉淀内容，先去“表达”页保存一句。'}
        </View>
        <Button className="secondary-button" onClick={() => Taro.switchTab({ url: '/pages/library/index' })}>
          去资产库查看
        </Button>
      </View>

      <View className="result-card">
        <View className="result-label">同步状态</View>
        <View className="profile-account-card">
          <View className="profile-account-row">
            <Text className="profile-account-label">登录状态</Text>
            <Text className="profile-account-value">{loggedIn ? '已登录' : '未登录'}</Text>
          </View>
          <View className="profile-account-row">
            <Text className="profile-account-label">上次同步</Text>
            <Text className="profile-account-value">{lastSyncedAt ? formatFriendlyTime(lastSyncedAt) : '尚未同步'}</Text>
          </View>
          <View className="profile-account-row">
            <Text className="profile-account-label">本地内容</Text>
            <Text className="profile-account-value">{hasLocalAssets ? `共 ${assetStats.totalCount} 条` : '暂无内容'}</Text>
          </View>
        </View>
        <Button className="primary-button" loading={loading} disabled={loading || !loggedIn} onClick={handleSync}>
          {loggedIn ? '立即同步' : '登录后同步'}
        </Button>
      </View>

      {loggedIn ? (
        <View className="result-card">
          <View className="result-label">账号与数据操作</View>
          <View className="meta-line">退出登录不会删除本机内容；清理缓存只影响本机，不会删除云端账号。</View>
          <Button className="secondary-button" onClick={handleLogout}>退出登录</Button>
          <Button className="danger-button" onClick={handleClearLocal}>清理本地缓存</Button>
        </View>
      ) : null}
    </View>
  );
}
