# VerbaLab WeChat Mini Program

这是 VerbaLab 小程序端的独立工程骨架。第一版目标不是复制 Web 端，而是落地三个轻量入口：

- `想说但不会说`
- `词卡复习`
- `我的表达`

## 当前状态

本目录目前是低侵入脚手架：

- 不改变根目录 Vite Web 应用。
- 不改变根目录 CI。
- 不安装小程序依赖。
- 不包含任何密钥。

等后端微信登录和小程序 API client 定稿后，再安装依赖并正式进入开发。

## 推荐安装

在本目录内执行：

```bash
npm i
npm run dev:weapp
```

需要使用微信开发者工具打开本目录生成的 `dist`。

## 关键边界

- 不直接 import Web 端 `src/app/utils/api/client.ts`，因为它依赖 Supabase Web session。
- 小程序端请求需要走 `wx.request`，并配置合法 request 域名。
- 小程序登录使用 `wx.login()`，后端换取 openid，前端不能保存微信 secret。
- 本地缓存使用小程序 storage，不使用浏览器 `localStorage`。

## 第一版页面

- `pages/expression-helper/index`：中文输入，生成自然英文表达。
- `pages/vocab-review/index`：词卡复习。
- `pages/library/index`：语料和卡壳点。
- `pages/profile/index`：账号、同步和邀请码绑定状态。
