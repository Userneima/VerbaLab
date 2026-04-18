# Project Overview

## Purpose
VerbaLab is a local-first English learning web app centered on three connected practice loops:

- `实验室 / Lab`: use a target collocation to build an English sentence, get grammar feedback, and store successful output as personal corpus.
- `单词卡片 / Vocab Cards`: generate, review, and revisit vocabulary cards with register guidance, example sentences, and spaced review actions.
- `实战仓 / Field`: use accumulated corpus and vocabulary in longer-form speaking or writing tasks.

The product is designed to reduce “I know the meaning but can’t say it” friction. The app favors scaffolded output, explicit feedback, and reviewable artifacts over passive browsing.

## Primary User
Chinese-speaking English learners preparing for real output:

- daily communication
- interviews and workplace English
- IELTS-style speaking/writing practice
- vocabulary-to-output transfer

## Core Success Criteria
- Users can turn a Chinese thought or target collocation into a natural English sentence with as little dropout as possible.
- Correct sentences are preserved and reused as personal corpus.
- Wrong sentences become reviewable error items instead of disappearing.
- Vocabulary cards help users decide what to say in real usage, not just memorize definitions.
- Cloud sync is optional, but local-first usage must remain reliable.

---

# Tech Stack

- Frontend: React 18 + Vite + TypeScript
- Styling: Tailwind CSS 4 + Radix UI primitives
- Routing: `react-router`
- State: custom app store via React context
- Persistence: localStorage first, optional Supabase sync
- Backend / AI: Supabase Edge Functions
- Monitoring: Sentry
- Speech: Azure Speech SDK
- Tests: Vitest + Testing Library

Useful commands:

```bash
npm run dev
npm run typecheck
npm run test
npm run build
```

---

# High-Level Architecture

## Frontend App Shell

- [src/app/App.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/App.tsx): app root
- [src/app/routes.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/routes.ts): route definitions
- [src/app/components/Layout.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/components/Layout.tsx): shared shell and navigation

## Store and Persistence

- [src/app/store/useStore.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/useStore.ts): main local-first domain store
- [src/app/store/StoreContext.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/StoreContext.tsx): context wrapper
- [src/app/store/useCloudSync.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/useCloudSync.ts): cloud sync side effects
- [src/app/store/AuthContext.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/AuthContext.tsx): auth/session state

## AI and Backend Integration

- [src/app/utils/api.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/api.ts): frontend API entry points
- [src/app/utils/grammarCheck.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/grammarCheck.ts): lab grammar checks and local fallback behavior
- [supabase/functions/make-server-1fc434d6/index.ts](/Users/yuchao/Documents/GitHub/VerbaLab/supabase/functions/make-server-1fc434d6/index.ts): main Edge Function for AI features

## Core Product Areas

- [src/app/pages/HomePage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/HomePage.tsx): overview dashboard, progress, calendar
- [src/app/pages/LabPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/LabPage.tsx): sentence-building lab
- [src/app/pages/useLabPageController.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/useLabPageController.ts): lab page orchestration
- [src/app/pages/CorpusPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/CorpusPage.tsx): personal corpus
- [src/app/pages/ErrorBankPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/ErrorBankPage.tsx): error review
- [src/app/pages/WordLabPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/WordLabPage.tsx): vocab card generation
- [src/app/pages/VocabReviewPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/VocabReviewPage.tsx): vocab card waterfall / browsing
- [src/app/pages/VocabCardDetailPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/VocabCardDetailPage.tsx): vocab card detail + review flow
- [src/app/pages/FieldPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/FieldPage.tsx): longer-form output practice
- [src/app/pages/FoundryPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/FoundryPage.tsx): collocation/foundry workflow
- [src/app/pages/StuckPointsPage.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/pages/StuckPointsPage.tsx): stuck-point review

## Shared Practice Utilities

- [src/app/data/verbData.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/data/verbData.ts): built-in collocation bank and example data
- [src/app/utils/sentenceTileBank.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/sentenceTileBank.ts): tokenized sentence reconstruction logic
- [src/app/components/VocabReproducePanel.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/components/VocabReproducePanel.tsx): tile-based vocab review
- [src/app/components/VocabRegisterGuideCard.tsx](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/components/VocabRegisterGuideCard.tsx): register analysis card

---

# Domain Model

The app revolves around a few persistent learning objects:

- `CorpusEntry`: successful user sentences stored for reuse
- `ErrorBankEntry`: wrong sentences plus diagnosis and corrected sentence when available
- `VocabCard`: headword-focused card with tags, examples, review state, and register analysis
- `StuckPoint`: Chinese thought + AI help trail for moments where the user could not phrase something

When changing data shape, check both local persistence and sync/merge behavior.

Especially relevant files:

- [src/app/utils/syncMerge.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/syncMerge.ts)
- [src/app/utils/corpusDedupe.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/corpusDedupe.ts)
- [src/app/utils/errorBankDedupe.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/errorBankDedupe.ts)
- [src/app/utils/reviewGate.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/reviewGate.ts)

---

# Product-Specific Working Notes

## Lab

The lab is not just a grammar checker. It is a scaffolded output trainer.

When editing lab behavior, preserve this general order:

1. user sees target collocation + Chinese context
2. user attempts sentence production
3. optional support appears (`卡壳了`, lowering difficulty, etc.)
4. grammar feedback arrives without directly giving away the answer
5. success writes to corpus; failure writes to error bank

Avoid turning the lab into passive answer consumption.

## Vocab Cards

Vocab cards should help with “what should I say in real usage?” rather than dictionary-like explanation.

When changing vocab card generation or display:

- keep register analysis actionable
- prefer concise, high-signal explanations over generic prose
- avoid fake spoken replacements that are not semantically equivalent
- preserve review state and due scheduling

## Error Bank

The error bank should reinforce the correct sentence, not burn in the wrong one.

Prefer:

- correct sentence as primary display
- wrong sentence visually de-emphasized
- key corrections surfaced clearly

## Local-First Principle

Most learning state should still work without cloud sync.

Do not make core practice loops depend on network-only success unless there is a graceful fallback.

---

# File and Folder Guidance

```text
src/app/pages/                 Route-level screens
src/app/components/            Shared product components
src/app/components/lab/        Lab-specific UI
src/app/components/ui/         UI primitives
src/app/store/                 App state, auth, sync
src/app/utils/                 Business logic, review logic, API helpers
src/app/data/                  Built-in learning content
supabase/functions/            Edge Functions and backend helpers
```

General expectations:

- put route orchestration in `pages/` or dedicated page controllers
- keep reusable logic in `utils/`
- keep product-specific view pieces in `components/`
- avoid stuffing more unrelated logic into [src/app/store/useStore.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/store/useStore.ts) unless it truly belongs in core state

---

# Testing and Verification

Minimum expectations after meaningful code changes:

- run `npm run typecheck`

Also run when relevant:

- `npm run test` for logic-heavy changes
- `npm run build` when route structure, bundling, or import boundaries change

If you change any of the following, verify extra carefully:

- Edge Function request/response schema
- sync/merge behavior
- review scheduling
- vocab card generation schema
- lab grammar feedback flow

---

# Problem Solving Principles

## Fix Root Cause and Prevent Recurrence

When a problem is found, do not stop at fixing the visible symptom.

Always try to do all of the following:

1. identify the direct cause
2. identify why the issue was able to happen
3. make the smallest effective change that prevents the same class of problem from happening again
4. apply that preventive improvement immediately when appropriate

Typical preventive improvements include:

- add validation
- tighten types
- add error handling
- add tests
- add lint / build / verification coverage
- improve config defaults
- improve documentation or structure rules

Prefer root-cause fixes plus recurrence prevention over one-off patches.

---

# Supabase and Deployment Notes

- Main Supabase project ref: `ztlrrovudbkmqqjaqhfu`
- Main AI function: `make-server-1fc434d6`
- Vercel is used for deployment

Deployment default for this project:

- for meaningful product/code changes that affect behavior, treat `验证通过后推送并触发部署` as the default
- do not wait for an extra reminder to push/deploy after important validated changes
- still pause first for destructive, risky, or ambiguous deployment-impacting actions
- if the user explicitly says not to deploy, that instruction overrides this default

## Change Management

Large product changes should be synchronized to GitHub automatically after local validation passes.

A large / major product change includes:

- new core feature
- major interaction flow change
- significant UI / UX revision
- architecture-affecting refactor
- important product logic change

Expected workflow:

1. complete implementation
2. run relevant validation (`typecheck`, `test`, `build` when applicable)
3. write a clear English commit message
4. commit changes
5. push to GitHub

Do not skip validation before push.
If there is real risk of breaking production, note that risk clearly before pushing or deploying.

If changing cross-origin API behavior, check CORS settings in the Edge Function and Supabase secrets.

If changing AI output shape, update both:

- frontend consumers in [src/app/utils/api.ts](/Users/yuchao/Documents/GitHub/VerbaLab/src/app/utils/api.ts) and related UI
- backend schema/prompting in [supabase/functions/make-server-1fc434d6/index.ts](/Users/yuchao/Documents/GitHub/VerbaLab/supabase/functions/make-server-1fc434d6/index.ts)

---

# Guardrails for Future Contributors

- Do not replace project-specific learning flows with generic CRUD UI.
- Do not optimize only for passing checks; optimize for actual learning value.
- Treat Chinese prompts, English output, review scaffolding, and correction visibility as core UX, not edge details.
- Keep terminology aligned with the product:
  - `实验室 / Lab`
  - `语料库 / Corpus`
  - `语法错误库 / Error Bank`
  - `词卡工坊 / Word Lab`
  - `单词卡片 / Vocab Cards`
  - `实战仓 / Field`

When in doubt, prefer changes that help the user:

- speak sooner
- understand mistakes faster
- review more purposefully
- reuse what they have already learned
