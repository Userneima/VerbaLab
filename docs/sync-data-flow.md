# Sync Data Flow

## Purpose

VerbaLab is local-first.
Cloud sync is a merge layer, not the source of truth for every interaction.

## Client Flow

### Local Load

`src/app/store/useStore.ts` loads:

- corpus
- error bank
- stuck points
- learned collocations
- vocab cards
- foundry example overrides

through `src/app/store/persistence.ts`.

### Client Merge / Sync Trigger

`src/app/store/useCloudSync.ts` is responsible for:

- initial login-time alignment
- push to cloud
- pull from cloud
- auto-sync toggle
- merge conflict resolution before state writeback

## Server Flow

Edge Function routes live in:

- `supabase/functions/make-server-1fc434d6/routes/sync.ts`

Current endpoints:

- `POST /make-server-1fc434d6/sync/save`
- `GET /make-server-1fc434d6/sync/load`

## Merge Rules

### Generic Entities

For corpus, error bank, and stuck points:

- merge by `id`
- newer `timestamp` wins

### Learned Collocations

- union merge

### Vocab Cards

Vocab cards use a dedicated merge rule:

- content fields follow newer `timestamp`
- review fields compare:
  - `lastViewedAt`
  - `reviewStage`
  - `nextDueAt`

This avoids losing review progress when the content timestamp does not change much.

### Foundry Example Overrides

- merge by key
- newer `updatedAt` wins

## Known Boundary

Deletion is still weaker than create/update merge semantics.
If future work needs reliable multi-device delete propagation, add explicit tombstone semantics instead of relying on absence.

## Guardrails

- Any change to persistent model shape must update both client normalization and server merge logic
- Any change to vocab review fields must be checked against `sync.ts` vocab merge rules
- If data appears inconsistent across localhost and Vercel, compare:
  - local storage snapshot
  - `/sync/load` payload
  - vocab review metadata (`reviewStage`, `lastViewedAt`, `nextDueAt`)
