# VerbaLab 微信小程序迁移设计

这份文档只服务一个目标：把 VerbaLab 做成更容易被普通用户打开和持续使用的微信小程序，而不是把现有 Web 端完整复制一遍。

## 1. 小程序版产品定位

小程序版是 VerbaLab 的轻量使用端。

它优先解决三个高频场景：

- 用户突然想表达一句中文，但不知道自然英文怎么说。
- 用户有几张词卡今天该复习，想在微信里快速过一遍。
- 用户想回看自己沉淀过的表达、语料和卡壳点。

第一版不追求覆盖 Web 端所有能力。复杂管理、长任务训练、大屏信息密度高的页面继续留在 Web 端。

## 2. 第一版 MVP 范围

### 必做页面

- `想说但不会说`
  - 输入中文想法。
  - 调用 AI 返回推荐表达、简短指导、2-3 条例句。
  - 用户可以把例句收入语料库，或改成自己的句子再保存。

- `词卡复习`
  - 只展示今天待复习或最近创建的词卡。
  - 支持查看语体解析、例句、目标搭配。
  - 支持 `记住了 / 还不熟` 两个主要复习动作。

- `我的表达`
  - 展示语料库和卡壳点。
  - 支持搜索、复制、再次练习。

- `账号 / 同步状态`
  - 微信登录状态。
  - 邀请码绑定状态。
  - 数据同步状态。

### 暂不搬迁

- 管理员后台。
- 完整实战仓。
- 完整实验室流程。
- 复杂学习日历。
- 词卡瀑布流多维排序。
- 桌面端侧边栏和大屏信息布局。

## 3. 推荐技术路线

小程序前端使用 `Taro + React + TypeScript`。

原因：

- 当前 Web 端已经是 React + TypeScript，迁移认知成本较低。
- 小程序端不能直接复用 DOM、Radix UI、浏览器 localStorage 和 Web Speech 相关实现。
- Taro 允许复用一部分纯 TypeScript 逻辑，但 UI 必须按小程序交互重新做。

不建议第一版使用 `web-view` 作为主方案：

- 体验更像“把网页塞进微信”，不是小程序原生体验。
- 业务域名和主体类型存在限制。
- 后续登录、分享、复制、输入体验都会受限。

## 4. 架构边界

### 复用

- Supabase Edge Function 作为 AI 与同步后端。
- 现有学习资产类型：词卡、语料、错题、卡壳点。
- 纯 TS 规则逻辑：复习时间、句子拆块、去重、词卡解析契约。

### 不复用

- Web 端页面组件。
- Radix UI 组件。
- Tailwind/Radix 布局结构。
- 浏览器专属 API：`localStorage`、DOM、文件选择、Web Speech。

### 需要抽象

- storage：Web 用 `localStorage`，小程序用 `wx.getStorageSync / wx.setStorageSync`。
- request：Web 用 `fetch + Supabase session`，小程序用 `wx.request + 小程序登录态`。
- auth：Web 用 Supabase email/password，小程序用微信 `wx.login()` 绑定后端用户。

## 5. 小程序登录与账号绑定

第一版推荐增加受控微信登录入口：

1. 小程序端调用 `wx.login()` 拿到 `code`。
2. 小程序端把 `code` 和可选 `inviteCode` 发到 Edge Function。
3. Edge Function 用微信 `appid + secret + code` 换取 `openid`。
4. 后端查找或创建 `wechat_openid -> user_id` 映射。
5. 首次绑定必须使用邀请码；已绑定用户以后免邀请码登录。
6. 后端返回小程序专用访问令牌或受控 session。

不要把微信 `appid secret` 放到小程序前端。

后端建议新增路由：

- `POST /make-server-1fc434d6/auth/wechat-login`
- `POST /make-server-1fc434d6/auth/wechat-bind-invite`

数据库建议新增表：

- `wechat_identities`
  - `id uuid primary key`
  - `user_id uuid not null references auth.users(id)`
  - `openid text not null unique`
  - `unionid text null`
  - `created_at timestamptz not null default now()`
  - `last_login_at timestamptz null`

## 6. 数据与同步策略

小程序端仍保持 local-first，但要更克制：

- 核心学习数据本地缓存。
- 登录后自动尝试云同步。
- 网络失败不阻断本地查看与保存。
- AI 请求失败需要明确显示失败，不用静默 fallback 伪装成功。

第一版小程序只同步这些对象：

- `corpus`
- `stuckPoints`
- `vocabCards`
- 词卡复习状态

错题库可以第二阶段再完整接入。

## 7. API 适配策略

Web 端当前 API 已拆到：

- `src/app/utils/api/client.ts`
- `src/app/utils/api/ai.ts`
- `src/app/utils/api/sync.ts`
- `src/app/utils/api/invites.ts`
- `src/app/utils/api/admin.ts`

小程序端不要直接 import Web API client。原因是 Web API client 依赖 Supabase Web session。

小程序需要自己的 request client：

- 使用 `wx.request`。
- token 存在小程序 storage。
- 请求域名必须配置到小程序后台合法域名。
- request header 不能依赖浏览器 CORS 语义。

## 8. 发布前置条件

- 注册微信小程序账号。
- 明确主体类型，避免后续 `web-view`、类目、备案受限。
- 完成小程序备案。
- 准备隐私政策与用户协议。
- 配置 request 合法域名。
- 准备微信登录配置：`WECHAT_MINIPROGRAM_APPID`、`WECHAT_MINIPROGRAM_SECRET`。
- Edge Function 增加对应环境变量，不进入前端仓库。

## 9. 第一版验收标准

- 用户能在小程序里完成微信登录。
- 新用户能用邀请码完成首次绑定。
- 用户能输入中文并获得与输入强相关的表达指导。
- 用户能把例句或自改句保存到语料库。
- 用户能看到并复习今天该看的词卡。
- 小程序离线或网络失败时，不丢本地已保存学习资产。
- Web 端现有登录、同步、词卡、卡壳点不受影响。

## 10. 当前执行顺序

1. 固定本设计文档。
2. 在 Web 端先抽象 storage 平台层。
3. 新建 `apps/weapp` 小程序工程骨架。
4. 增加小程序 request/auth 设计入口。
5. 后端实现微信登录绑定。
6. 小程序实现 `想说但不会说`。
7. 小程序实现词卡复习。
8. 小程序实现语料库和卡壳点查看。
