# VerbaLab AI 接手文档入口

## 这套文档是干什么的

这组文档只服务一件事：让另一个 AI 在最短时间内接手 VerbaLab，而不是从头翻完整个仓库。它不替代 [AGENTS.md](/Users/yuchao/Documents/GitHub/VerbaLab/AGENTS.md)，也不重复现有 `docs/` 里的专题说明，而是把“产品是什么、现在做到哪、哪些不能乱动、哪些坑别再踩”压成一层接手入口。

## 推荐阅读顺序

1. [PRODUCT_BRIEF.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/ai-handoff/PRODUCT_BRIEF.md)
2. [CURRENT_STATE.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/ai-handoff/CURRENT_STATE.md)
3. [GUARDRAILS.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/ai-handoff/GUARDRAILS.md)
4. [LESSONS_LEARNED.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/ai-handoff/LESSONS_LEARNED.md)

## AGENTS.md 与这里的分工

- [AGENTS.md](/Users/yuchao/Documents/GitHub/VerbaLab/AGENTS.md)：最高优先级规则、产品原则、工程约束、部署默认行为
- `docs/ai-handoff/`：接手 AI 的产品理解层，不展开专题实现细节
- 现有 `docs/`：store、sync、edge function、邀请码等专题说明

如果 handoff 文档和 AGENTS 有冲突，以 AGENTS 为准。

## 什么时候去看现有专题 docs

遇到下面这些问题时，不要在 handoff 文档里硬找答案：

- store 结构与职责：看 [store-domain-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/store-domain-map.md)
- 本地优先与云同步：看 [sync-data-flow.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/sync-data-flow.md)
- Edge Function 路由与职责：看 [edge-function-route-map.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/edge-function-route-map.md)
- 邀请码注册与运维：看 [invite-registration.md](/Users/yuchao/Documents/GitHub/VerbaLab/docs/invite-registration.md)

## 更新规则

这套文档只写当前仍然有效、能指导下次改动的内容。不要把 commit 流水账、临时需求、未来计划写进来；如果某条结论已经不能从代码、现有 docs 或 git 历史中找到依据，就应该删掉或重写。
