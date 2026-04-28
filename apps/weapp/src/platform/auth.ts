import { requestJson } from './request';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { clearRefreshToken, setAuthToken, setRefreshToken, setUserProfile } from './storage';

export type WechatLoginResult = {
  token?: string;
  userId?: string;
  expiresAt?: string;
  isNewUser?: boolean;
  needsInvite?: boolean;
};

type PasswordLoginResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
  };
  error?: string;
  error_description?: string;
  msg?: string;
};

function toPasswordLoginErrorMessage(body: PasswordLoginResponse): string {
  const rawMessage = body.error_description || body.msg || body.error || '';
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return '邮箱或密码不正确。这里登录的是 VerbaLab / Supabase 账号密码，不是 Gmail 邮箱密码。';
  }
  if (normalized.includes('email not confirmed')) {
    return '这个邮箱还没有完成确认，请先在 Web 端确认账号状态。';
  }
  if (normalized.includes('too many')) {
    return '登录尝试过多，请稍后再试。';
  }

  return rawMessage || '账号或密码不正确';
}

function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) {
          resolve(result.code);
          return;
        }
        reject(new Error('微信登录失败：未返回 code'));
      },
      fail(err) {
        reject(new Error(err.errMsg || '微信登录失败'));
      },
    });
  });
}

export async function loginWithWechat(inviteCode?: string): Promise<WechatLoginResult> {
  const code = await wxLogin();
  const result = await requestJson<WechatLoginResult>({
    method: 'POST',
    path: '/auth/wechat-login',
    data: { code, inviteCode },
  });
  if (result.token && result.userId && result.expiresAt) {
    setAuthToken(result.token);
    clearRefreshToken();
    setUserProfile({
      userId: result.userId,
      expiresAt: result.expiresAt,
      isNewUser: result.isNewUser,
      provider: 'wechat',
    });
  }
  return result;
}

export function loginWithPassword(email: string, password: string): Promise<WechatLoginResult> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      method: 'POST',
      data: { email, password },
      header: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      success(res) {
        const body = res.data as PasswordLoginResponse;
        if (res.statusCode < 200 || res.statusCode >= 300 || !body.access_token || !body.user?.id) {
          reject(new Error(toPasswordLoginErrorMessage(body)));
          return;
        }
        const expiresAt = new Date(Date.now() + (body.expires_in || 3600) * 1000).toISOString();
        setAuthToken(body.access_token);
        if (body.refresh_token) setRefreshToken(body.refresh_token);
        setUserProfile({
          userId: body.user.id,
          email: body.user.email,
          expiresAt,
          provider: 'password',
        });
        resolve({
          token: body.access_token,
          userId: body.user.id,
          expiresAt,
          isNewUser: false,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '账号密码登录失败'));
      },
    });
  });
}
