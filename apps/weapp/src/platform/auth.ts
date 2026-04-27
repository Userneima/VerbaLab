import { requestJson } from './request';
import { setAuthToken } from './storage';

export type WechatLoginResult = {
  token: string;
  isNewUser?: boolean;
  needsInvite?: boolean;
};

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
  if (result.token) setAuthToken(result.token);
  return result;
}
