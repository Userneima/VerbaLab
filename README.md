# VerbaLab

VerbaLab 是一个 local-first 的英语输出训练 Web App，核心围绕实验室、词卡、实战仓、错题库、语料库和卡壳点沉淀，帮助中文英语学习者把“知道意思”转成“能自然说出来”。

## AI / Contributor Entry

接手项目时不要从全仓扫描开始。优先阅读：

1. `AGENTS.md`
2. `docs/CONTEXT_INDEX.md`
3. `docs/ai-handoff/README.md`

`docs/CONTEXT_INDEX.md` 会告诉你当前可信入口、哪些大文件不要整读、哪些归档或生成物不应优先进入上下文。

## Development

```bash
npm i
npm run dev
```

常用验证命令：

```bash
npm run typecheck
npm run test
npm run build
```

GitHub Actions 会执行上述前端检查，并对当前 Supabase Edge Function 入口运行：

```bash
deno check supabase/functions/make-server-1fc434d6/index.ts
```

## Supabase Edge Function

当前真实 Edge Function 入口：

```text
supabase/functions/make-server-1fc434d6/index.ts
```

前端请求：

```text
https://<project>.supabase.co/functions/v1/make-server-1fc434d6/...
```

部署命令：

```bash
npx supabase login
npx supabase functions deploy make-server-1fc434d6 --project-ref <Supabase Project ID> --use-api
```

当前主项目 ref：

```text
ztlrrovudbkmqqjaqhfu
```

更多路由边界看 `docs/edge-function-route-map.md`。

## Security

- `SUPABASE_SERVICE_ROLE_KEY` 只允许放在 Supabase Edge Function 服务端环境变量里。
- 前端只能使用 anon key 和登录后的 user access token。
- 修改 CORS、Auth、Sync、AI schema 或管理员后台时，先看 `AGENTS.md` 和对应 docs。

## Local Launch Script

仓库仍保留 `open-elis.ps1`，用于本地桌面快捷方式启动。它不是产品架构入口；调试和开发优先使用 `npm run dev`。
