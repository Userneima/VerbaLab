# VerbaLab Context Index

这份文档只解决一个问题：让接手 AI 少读错文件、少读大文件、少被旧残留带偏。

## 先读顺序

1. `AGENTS.md`：项目规则、产品原则、验证和部署要求。
2. `docs/ai-handoff/README.md`：AI 接手文档入口。
3. 本文件：当前可信入口、上下文边界和搜索规则。

如果任务已经明确，只读对应专题文档，不要从全仓开始扫。

## 当前可信入口

- 前端路由：`src/app/routes.ts`
- App shell：`src/app/App.tsx`、`src/app/components/Layout.tsx`
- Store 组合层：`src/app/store/useStore.ts`
- Store 类型：`src/app/store/types.ts`
- 前端 API 门面：`src/app/utils/api.ts`
- 前端 API 分区：`src/app/utils/api/admin.ts`、`src/app/utils/api/ai.ts`、`src/app/utils/api/sync.ts`、`src/app/utils/api/invites.ts`
- Supabase Edge Function 入口：`supabase/functions/make-server-1fc434d6/index.ts`
- Edge route map：`docs/edge-function-route-map.md`
- 微信小程序骨架：`apps/weapp/`

## 按任务读这些文件

- 产品理解：`docs/ai-handoff/PRODUCT_BRIEF.md`
- 当前状态：`docs/ai-handoff/CURRENT_STATE.md`
- 不能乱动的边界：`docs/ai-handoff/GUARDRAILS.md`
- 已踩坑：`docs/ai-handoff/LESSONS_LEARNED.md`
- Store / domain：`docs/store-domain-map.md`
- 本地优先和云同步：`docs/sync-data-flow.md`
- Edge Function：`docs/edge-function-route-map.md`
- 邀请码注册：`docs/invite-registration.md`
- 微信小程序迁移：`docs/wechat-miniprogram-migration.md`
- 管理员观测 SQL：`docs/sql/admin-observability.sql`

## 不要优先读取

- `dist/`：构建产物。
- `node_modules/`：依赖目录。
- `apps/weapp/dist/`：小程序构建产物。
- `docs/archive/`：历史归档，只在追溯旧产品设定时读取。
- `scripts/.verbdata-translation-cache.json`：脚本缓存。
- `.DS_Store`：系统文件。

## 大文件读取规则

- `src/app/data/verbData.ts` 是静态学习数据，文件顶部有 `VERB_DATA_CONTEXT_INDEX`。先用 `rg` 定位具体动词、搭配或问题，不要整文件读取。
- `supabase/functions/make-server-1fc434d6/routes/ai-vocab.ts` 现在只负责词卡 AI route handler；prompt / parser / guardrail / service 分别在 `routes/ai-vocab/` 下。
- `src/app/pages/FieldPage.tsx` 现在主要负责实战仓页面编排；答题、语料、卡壳、评价面板在 `src/app/components/field/` 下。
- `src/app/utils/api.ts` 只是兼容 re-export 门面。改具体能力时优先读 `src/app/utils/api/admin.ts`、`ai.ts`、`sync.ts`、`invites.ts` 或共享 `client.ts`。
- `src/app/pages/InviteCodesPage.tsx` 现在被 `AdminPage` 作为邀请码 Tab 复用。改管理员后台时先看 `AdminPage.tsx`。
- `apps/weapp/` 是小程序独立骨架，不参与当前根目录 Vite 构建；不要把它的 Taro 依赖误加到 Web 端运行链路里。

## 常见上下文陷阱

- 当前 Edge Function 只有 `supabase/functions/make-server-1fc434d6/` 是可信入口。
- 旧 PRD 已归档为 `docs/archive/legacy-prd-fluentflow-2.0.md`，不是当前产品状态。
- README 只用于启动和入口导航；项目真实边界以 `AGENTS.md` 和 `docs/ai-handoff/` 为准。
- 不要把 UI primitive 大文件当成业务逻辑。`src/app/components/ui/` 多数是组件库基础件。

## 推荐搜索方式

```bash
rg "keyword" src/app supabase/functions/make-server-1fc434d6 docs -g '!docs/archive/**'
rg --files src/app supabase/functions/make-server-1fc434d6 docs | rg -v 'docs/archive|\\.DS_Store'
```

避免：

```bash
find .
rg "keyword" .
```

这两种会把构建产物、依赖、归档和系统文件一起拉进视野。
