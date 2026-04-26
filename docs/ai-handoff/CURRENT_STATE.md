# VerbaLab 当前状态

## 当前快照

VerbaLab 已经不是早期 demo，而是一套可以实际使用的本地优先英语学习应用。核心练习区、资产沉淀区、错题回看、词卡生成与复习、卡壳点记录、邀请码注册都已经落地。当前仓库更像“已经能用、但仍在持续收口”的产品，而不是“架子刚搭起来”的项目。

## 已稳定的核心能力

下面这些能力已经具备真实使用价值，不是概念功能：

- 实验室：基于目标搭配造句、语法反馈、卡壳支援、正确入语料、错误入错题
- 词卡工坊：输入单词后生成词卡预览、标签、语体解析和例句，并保存到词卡系统
- 单词卡复习：词卡详情、语体解析、例句查看、句子复原、间隔复习推进
- 错题库：正确句优先展示、错误句弱化、正确句补全、手动编辑、恢复待复习
- 语料库：句子沉淀、翻译补全、编辑、删除、跳转高亮
- 卡壳点页：实验室/实战仓卡壳记录 + 自由输入“想说但不会说”求助
- 实战仓：长输出练习、支架辅助、降难度、关键句重排
- 邀请码注册：前端受控注册 + Supabase 服务端邀请码消费

## 近期已收敛的重点链路

从近期提交和已有文档看，下面这些链路已经明显比早期稳定：

- store 已从大一统文件拆成 domain 组合层，见 [store-domain-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/store-domain-map.md)
- Edge Function 已拆成 route modules，不再把所有后端逻辑塞进单文件，见 [edge-function-route-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/edge-function-route-map.md)
- 云同步已经从“整包覆盖”改成服务端 merge，尤其词卡 review metadata 已单独处理，见 [sync-data-flow.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/sync-data-flow.md)
- 错题正确句已经进入持久化链路，不再只是页面临时显示
- 卡壳点“想说但不会说”面板不再用静默 fallback 冒充 AI 成功
- 注册已切到 invite-only flow，并关闭公开 signup 绕过路径

## 仍然脆弱或高风险的区域

当前最值得保持警惕的不是“有没有功能”，而是下面这些边界容易再出问题：

### 删除语义仍弱

同步系统现在对新增和更新更稳，但多端删除仍然没有 tombstone 语义。当前 [sync-data-flow.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/sync-data-flow.md) 已明确写了这是已知边界，所以涉及删除传播时不能想当然。

### AI response shape 很容易前后端脱节

AI 结果被多个页面直接消费，一旦 Edge Function 返回字段变化，前端解析、store 字段和 UI 展示就会一起受影响。这个风险在卡壳点标题、词卡语体解析、错题正确句、stuck helper 这几条链路上都出现过。

### 部分高频页面仍然偏大

下面这几页虽已在收口，但仍然是高频改动热点：

- [FieldPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/FieldPage.tsx)
- [HomePage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/HomePage.tsx)
- [StuckPointsPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/StuckPointsPage.tsx)

它们不是不能改，而是每次改动都更容易把状态、文案、交互和业务逻辑重新缠在一起。

## 当前真实架构状态

当前结构不是“完全理想化”，但已经有比较清楚的分层：

- `useStore.ts` 已经变成组合层，而不是主要业务逻辑仓库
- store 领域拆分已存在：corpus、error bank、stuck points、vocab cards、foundry
- Edge Function 已按 auth / sync / speech / core AI / vocab AI 分组
- 页面拆分已开始：
  - `VocabCardDetailPage`
  - `ErrorBankPage`
 这些已经明显收口
- 但首页、实战仓、卡壳点页仍然比理想状态更重

所以当前最准确的表述是：**结构已经进入“可维护化”阶段，但还没完全结束。**

## 高频改动文件

另一个 AI 接手时，最容易真正碰到的文件不是全仓库，而是下面这些：

- [src/app/pages/FieldPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/FieldPage.tsx)
- [src/app/pages/StuckPointsPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/StuckPointsPage.tsx)
- [src/app/pages/HomePage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/HomePage.tsx)
- [src/app/store/useCloudSync.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/useCloudSync.ts)
- [src/app/utils/api.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/api.ts)
- [supabase/functions/make-server-1fc434d6/routes/ai-core.ts](/Users/yuchao/Documents/GitHub/VerbaLab/supabase/functions/make-server-1fc434d6/routes/ai-core.ts)
- [supabase/functions/make-server-1fc434d6/routes/ai-vocab.ts](/Users/yuchao/Documents/GitHub/VerbaLab/supabase/functions/make-server-1fc434d6/routes/ai-vocab.ts)
- [supabase/functions/make-server-1fc434d6/routes/sync.ts](/Users/yuchao/Documents/GitHub/VerbaLab/supabase/functions/make-server-1fc434d6/routes/sync.ts)

## 新 AI 最值得先看的入口

如果是第一次接手，不要先扫所有页面，优先按这个顺序：

1. 看 [AGENTS.md](/Users/yuchao/Documents/GitHub/VerbaLab/AGENTS.md) 把产品原则和工程默认行为吃透
2. 看 [store-domain-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/store-domain-map.md)、[sync-data-flow.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/sync-data-flow.md)、[edge-function-route-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/edge-function-route-map.md)
3. 再看高频页面：
   - [FieldPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/FieldPage.tsx)
   - [StuckPointsPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/StuckPointsPage.tsx)
   - [VocabCardDetailPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/VocabCardDetailPage.tsx)
   - [ErrorBankPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/ErrorBankPage.tsx)

这样能最快建立“产品逻辑 + 数据边界 + 高风险区”这三层心智，不会一上来陷进无关文件。
