# Store Domain Map

## Purpose

`src/app/store/useStore.ts` is now a composition layer.
It should coordinate domains, persistence, and cloud sync, but should not grow back into a single business-logic file.

## Current Domain Split

### `src/app/store/domains/corpusDomain.ts`

Owns:

- add corpus entry
- update corpus entry
- delete corpus entry
- corpus dedupe checks

Input dependencies:

- `setCorpus`
- `corpusDedupeIndexRef`

### `src/app/store/domains/errorBankDomain.ts`

Owns:

- add error entry
- mark resolved
- update corrected sentence
- delete error entry
- unresolved dedupe checks

Input dependencies:

- `setErrorBank`
- `errorDedupeIndexRef`

### `src/app/store/domains/stuckPointsDomain.ts`

Owns:

- add stuck point
- delete stuck point

Input dependencies:

- `setStuckPoints`

### `src/app/store/domains/vocabCardsDomain.ts`

Owns:

- add / update / delete vocab cards
- review actions
- `vocabDueCount`

Important rule:

- review time progression must stay inside this domain or dedicated review helpers, not in page components

### `src/app/store/domains/foundryDomain.ts`

Owns:

- foundry example override CRUD

Input dependencies:

- `setFoundryExampleOverrides`

## Composition Responsibilities In `useStore.ts`

`useStore.ts` should keep only:

- initial local loading
- persistence effects
- dedupe index rebuilding
- legacy migration effects
- domain composition
- cloud sync composition
- cross-domain summary stats

## Files Supporting The Store

- `src/app/store/types.ts`: shared persistent model types and normalization
- `src/app/store/persistence.ts`: localStorage load/save helpers
- `src/app/store/useCloudSync.ts`: remote sync side effects and conflict handling

## Guardrails

- New domain logic should go into a domain file first, not directly into `useStore.ts`
- If a feature changes persistence shape, update both `types.ts` normalization and sync behavior
- If a feature changes review behavior, add or update tests before merging
