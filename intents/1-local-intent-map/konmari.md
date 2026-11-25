<!-- generated-by: sdlc-intent-map/konmari@0.1.0 -->
# §1 KonMari record

outcome: kept
base: 045fe72

## Tidied
- bb96c11 — src/core/layout.mjs, src/web/app.mjs — the intent's display name (`title ?? slug ?? ''`) was computed five times (four in `layout.mjs`, one in the page's reader title); it is now one exported `titleOf` in the core, and the page reads it from there (principles 4, 5). `npm run verify` green: lint clean, test:kit 376/376, test:app 95/95.

## Looked at and left
- The queue's group keys are listed twice: `QUEUE_GROUPS` in `src/server/repo.mjs` and the picker's `[key, title]` pairs in `src/core/layout.mjs` (`pickerGroups`). A fold (export `QUEUE_GROUPS` from the core, derived from the picker's list, imported by `repo.mjs`) was made, but its `npm run verify` run was stopped by the system for low memory before it finished. Unverified, it was not committed; the files were restored by copy from bb96c11. It is a small, safe fold for a later pass.
- `{ ...process.env, GIT_OPTIONAL_LOCKS: '0' }` is built twice in `src/server/repo.mjs` (`gitRead` and `readQueue`). Same value, but two lines; a helper would add about as much as it removes. Left.
- `findInQueue` in `src/server/repo.mjs` is pure logic in the I/O layer (principle 3). Moving it to the core is outside this step's reach (a move between layers' modules plus its tests); proposed below.
- `send(res, …, 'text/plain; charset=utf-8', …)` appears twice in `src/server/server.mjs` (403 and 405). Different responses with a shared content type; not a duplicated computation. Left.
- `src/test/fixture-repo.mjs` (`metadataYml`, `intentFiles`) against the kit's own test helpers in `scripts/*.test.mjs`: the kit's tests build their own repos for their own reasons (different layouts and assertions), so different reasons to change. Left.
- The picker's group titles in `layout.mjs` (`In flight`, `Queued`, …) repeat `scripts/queue-lib.mjs`'s titles. The core may not import `scripts/` (principle 2), so one source would need a layer decision. Proposed below.
- `package.json`: the `engines` object was reflowed onto three lines by npm. Formatting only; left.
- `eslint.config.mjs`, `bin/intent-map.mjs`, `src/server/static.mjs`, `src/web/render.mjs`, `src/core/docref.mjs`, `src/core/hash.mjs`, `src/architecture.test.mjs` and the kit edits (`scripts/intent-check-lib.mjs`, `scripts/size-budget-lib.mjs`, `scripts/spawn-intent.mjs`, the docs): no dead code, duplication or naming mismatch found.
- No budgeted file is over 500 lines; `scripts/size-baseline.json` stays `{}`.

## Proposed refactor intents
- refactor: one home for the queue's groups. Fold `QUEUE_GROUPS` (`src/server/repo.mjs`) into the core's group list (`src/core/layout.mjs`), and decide whether the picker titles should come from `scripts/queue-lib.mjs` (would need a principle 2 exception for the core, or the server passing titles through the API).
- refactor: move `findInQueue` from `src/server/repo.mjs` into `src/core/` with a unit test (principles 3, 9).
