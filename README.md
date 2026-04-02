
  # 核心动词学习系统

  This is a code bundle for 核心动词学习系统. The original project is available at https://www.figma.com/design/nb1koBsEHzrPo4tDldNBpY/%E6%A0%B8%E5%BF%83%E5%8A%A8%E8%AF%8D%E5%AD%A6%E4%B9%A0%E7%B3%BB%E7%BB%9F.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

### 一键启动脚本

项目根目录下提供了一个 `open-elis.ps1` 脚本，用于在 Windows 桌面上创建“单击即打开”的快捷方式。它会：

1. 读取 `.env` 中的配置（如端口、APP_URL、NODE_ENV）并设置环境变量。
2. 如果没有运行中的服务器则执行 `npm run start`（会根据 `NODE_ENV` 选择开发或预览模式）。
3. 最后在默认浏览器中打开相应的 URL。

脚本路径可拷贝到桌面，并在桌面上新建快捷方式指向该脚本，或者直接右键“发送到 -> 桌面快捷方式”。

脚本会在第一次运行时自动在当前用户桌面生成名为 “核心动词学习系统.lnk” 的快捷方式，无需额外参数。如果你想手动重建或在其他用户下创建，可以运行：

```powershell
powershell -ExecutionPolicy Bypass -File open-elis.ps1 -InstallShortcut
```

快捷方式指向脚本本身，双击即可启动服务并打开应用。


（`.env.example` 文件提供默认值，复制为 `.env` 并根据需要修改即可。）

### Supabase Edge 函数（词卡工坊 / 同步等）

前端会请求 `https://<project>.supabase.co/functions/v1/make-server-1fc434d6/...`。若**词卡工坊**报 **404**，说明线上函数仍是旧版本，需要重新部署：

```bash
npx supabase login
npx supabase functions deploy make-server-1fc434d6 --project-ref <你的 Supabase Project ID>
```

`Project ID` 与 `utils/supabase/info.tsx` 里的 `VITE_SUPABASE_PROJECT_ID` 一致。部署后需在 Supabase 项目环境变量中配置 `DEEPSEEK_API_KEY`（以及语音等已有变量）。

### 密钥与安全

- **Service role**（如 `SUPABASE_SERVICE_ROLE_KEY`）仅放在 **Supabase Edge / 服务端密钥**，不要写入前端 `.env` 或任何 `VITE_*` 变量；前端只用 **anon** + 用户登录后的 **access token**。
- 修改同步或 AI 相关 Edge 逻辑后，请执行一次 `npx supabase functions deploy ...`（见上文），与前端保持同期发布。

### 本地脚本（CI 对齐）

```bash
npm run typecheck   # TypeScript
npm run test        # Vitest
npm run build       # 生产构建
```

GitHub Actions 会对上述命令及 `deno check supabase/functions/make-server-1fc434d6/index.ts` 做校验。
