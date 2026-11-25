<!-- generated-by: sdlc-intent-map/konmari@0.1.0 -->
# §5 KonMari record

outcome: nothing to tidy
base: 99ba242

## Tidied
- none

## Looked at and left
- `src/core/queue.mjs` — `GROUPS`, the derived `QUEUE_GROUPS` and `findInQueue` are one home for the keys, their order and the lookup (principles 4, 5). Both exports have readers (`layout.mjs` reads `GROUPS`, `repo.mjs` and `findInQueue` read `QUEUE_GROUPS`), so neither is dead. The header comment points to the recorded exception without restating it.
- `src/core/layout.mjs` `pickerGroups` — reads `GROUPS`; no leftover local list. `layoutBoard`'s use of `queue.inFlight` (columns by status) is not a duplicate of the group list: it splits one group by status and has a different reason to change (principle 5).
- `src/server/repo.mjs` — the local `QUEUE_GROUPS` and `findInQueue` are gone; the only uses are the core import and the shape check at `:93`. No dead code left behind.
- `src/server/server.mjs` — imports `findInQueue` from the core after the `./` imports, while `repo.mjs` lists core imports before its kit import. Import order is not a pattern within the same file, and reordering would be churn; left.
- No other copy of the five group keys in `src/web/` or `bin/` (grep). The key literals in `queue.test.mjs`, `queue-shape.test.mjs` and `layout.test.mjs` are test fixtures and expected values; tests are out of reach.
- `src/server/queue-shape.test.mjs` — review.md LOW-1 (the `eslint-disable-line` comment, the header claiming all five keys, and the surviving M19). Left as instructed: it changes a test, and it is the owner's call at the diff read.
- `docs/architecture.md` exception row and the `CLAUDE.md` module map line — accurate at HEAD; nothing to remove.

## Proposed refactor intents
- none
