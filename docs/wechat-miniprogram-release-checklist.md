# VerbaLab 小程序内测发布检查清单

这份清单用于小程序体验版/内测版发布前确认，避免“代码已完成但线上配置漏一步”。

## 1. 微信公众平台配置

- AppID：`wxcdfd29d7ea0e35ec`
- request 合法域名只需配置：
  - `https://ztlrrovudbkmqqjaqhfu.supabase.co`
- socket / uploadFile / downloadFile / udp / tcp 域名第一版不用填。
- 小程序备案、微信认证按平台要求完成后再提交审核；体验版可先用于内测。

## 2. Supabase Edge Function Secrets

已配置：

- `WECHAT_MINIPROGRAM_APPID`

仍需从微信公众平台获取并配置：

```bash
supabase secrets set WECHAT_MINIPROGRAM_SECRET=你的微信小程序AppSecret --project-ref ztlrrovudbkmqqjaqhfu --dns-resolver https
supabase functions deploy make-server-1fc434d6 --project-ref ztlrrovudbkmqqjaqhfu --use-api --dns-resolver https
```

不要把 AppSecret 写入代码、文档正文或提交到 GitHub。

## 3. 发布前本地验证

```bash
npm run typecheck
npm run test
npm run build:weapp --prefix apps/weapp
```

## 4. 开发者工具验证

- 导入目录：`/Users/yuchao/Documents/GitHub/VerbaLab/apps/weapp`
- AppID：`wxcdfd29d7ea0e35ec`
- 后端服务：不使用云服务
- 编译后验证：
  - 匿名生成“想说但不会说”表达指导。
  - 保存例句时未登录会提示去“我的”绑定。
  - “我的”里输入有效邀请码完成微信绑定。
  - 绑定后保存例句，能在“我的表达”看到。
  - Web 端创建的词卡能在“词卡”页同步并复习。

## 5. 体验版上传前确认

- 页面中不能保留“下一步接入”“占位”等测试文案。
- Console 不应有阻断运行的红色错误。
- 真机预览能完成：生成表达、登录绑定、保存、同步、词卡复习。
