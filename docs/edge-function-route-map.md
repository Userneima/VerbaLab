# Edge Function Route Map

## Entry Point

- `supabase/functions/make-server-1fc434d6/index.ts`

This file should stay small.
Its job is only:

- create the Hono app
- apply platform middleware
- register route groups
- serve the app

## Platform Layer

- `supabase/functions/make-server-1fc434d6/platform.ts`

Owns:

- Supabase admin client
- CORS rules
- auth extraction
- AI / speech rate limiting
- invite helpers
- error capture

## Route Groups

### Auth

- `routes/auth.ts`

Current responsibility:

- invite-only signup

### Sync

- `routes/sync.ts`

Current responsibility:

- sync save
- sync load
- server-side merge

### Speech

- `routes/speech.ts`

Current responsibility:

- Azure speech token issuance

### Core AI

- `routes/ai-core.ts`

Current responsibility:

- grammar check
- grammar tutor
- stuck suggestion
- answer evaluation
- translation / chinglish helpers

### Vocab AI

- `routes/ai-vocab.ts`

Current responsibility:

- spoken register assessment
- register guide enrichment / fallback
- vocab card generation
- original-daily sentence generation
- register-guide-only repair path

### Admin / Observability

- `routes/admin.ts`

Current responsibility:

- admin overview
- invite-to-account usage
- usage alerts
- unblock users
- product usage event intake

### Shared AI Helpers

- `routes/ai-shared.ts`

Current responsibility:

- model call wrapper
- resilient JSON parsing

### Observability Helpers

- `observability.ts`

Current responsibility:

- AI token usage recording
- usage spike policy
- temporary AI blocks
- admin alert creation
- product usage event sanitization

## Removed Legacy Entry

- `supabase/functions/server/` was an old Figma Make-style function bundle.
- It is not deployed by the current Supabase config and must not be treated as an entry point.

## Design Rules

- Keep public URLs stable even when files move
- Add new AI capabilities as a new route module when they are materially different
- Parsing, retries, and fallbacks should live in the module that owns that response contract
- Do not re-centralize business logic into `index.ts`

## When Adding A New Route

1. decide whether it belongs to an existing route group
2. if not, create a new route module
3. keep input validation near the handler
4. keep model parsing and fallback logic inside the same module
5. register the route from `index.ts` only
