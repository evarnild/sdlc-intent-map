<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §5 — The queue's groups and the queue lookup each have one home, in the core

**Type:** refactor
**Originator:** a review finding: the KonMari step's proposals on §1
**Source:** `intents/1-local-intent-map/konmari.md` → "Proposed refactor
intents" and "Looked at and left"

## Problem

`intents/1-local-intent-map/konmari.md` found two places where §1 put a rule in
the wrong layer or in two places, and left them because they were outside the
KonMari step's reach:

1. **The queue's group keys are written twice.** "`QUEUE_GROUPS` in
   `src/server/repo.mjs` and the picker's `[key, title]` pairs in
   `src/core/layout.mjs` (`pickerGroups`)". `repo.mjs:20` has
   `const QUEUE_GROUPS = ['inFlight', 'queued', 'shipped', 'stopped', 'other']`
   (used at `:93` to check the queue's shape and at `:102` by `findInQueue`);
   `layout.mjs` lists the same keys with titles. `docs/architecture.md`
   principle 4 says: "A rule, a number or a prompt has one home, and anything
   showing it reads from there." KonMari made the fold and then lost its
   `verify` run to the memory limit, so it was discarded unverified; the
   record calls it "a small, safe fold for a later pass".
2. **`findInQueue` is logic in the I/O layer.** "pure logic in the I/O layer
   (principle 3)": `src/server/repo.mjs:101` walks the groups to find an
   intent by id. It has no I/O and is tested only through the HTTP API
   (`src/server/api.test.mjs`), where a failure needs a fixture repo. The
   plan's own "Where this goes" put queue logic in `src/core/`
   (principle 3: "Logic lives in the core"; principle 9: "New logic goes in
   pure functions with tests").

A third item is a layer question, not a fold: "The picker's group titles in
`layout.mjs` (`In flight`, `Queued`, …) repeat `scripts/queue-lib.mjs`'s
titles. The core may not import `scripts/` (principle 2), so one source would
need a layer decision."

## Outcome

- The five group keys appear once in `src/core/`, as an exported list that
  `layout.mjs` (picker, columns) and `repo.mjs` (the shape check and the
  lookup) both read.
- `findInQueue` lives in `src/core/` with a unit test of its own (found in
  each group, absent, a string id, a numeric id, an empty queue), and
  `src/server/repo.mjs` imports it.
- No observable change: the same HTTP responses, the same board, the same
  picker. The existing tests stay green and untouched.
- The question about the picker titles is answered in the plan, one of: the
  titles stay as the page's own wording and the duplication is recorded as an
  exception in `docs/architecture.md`; or the server passes the titles through
  the API from one source; or the core gets an explicit exception to import
  them. The refactor does not change what the picker shows.

## Constraints

- **Behaviour is held constant.** No existing test is edited, deleted or
  loosened; `check:intent` routes a refactor that deletes test lines.
- **Layers:** `src/core/` imports nothing from `src/server/`, `src/web/` or
  `node:` (principle 1, enforced by `src/architecture.test.mjs` and lint); the
  server may import the core.
- **No new dependency, no change to the API's shape**, and no edit to
  `scripts/queue-lib.mjs` (the target repo's own queue stays the source).
- **Tier:** `src/server/**` and `src/core/**` are not on the Reviewed paths;
  the path table sets it. `src/core/` is `CORE_CODE`, so `check:intent` expects
  tests with the change.
- **Cost:** a small change (about two source files and one new test file);
  no model calls, no live check owed beyond `REVIEW-POLICY.md` rule 1, which
  names `src/server/**` and so will owe one.

## Type-specific questions

### Refactor
- **What is restructured:** `QUEUE_GROUPS` and `findInQueue`
  (`src/server/repo.mjs`) into `src/core/` (the existing `layout.mjs`, or a new
  `queue.mjs` module), and `pickerGroups`' key list in `src/core/layout.mjs`.
  Possibly `src/server/server.mjs:4,49`, which imports `findInQueue`.
- **How behaviour is held constant:** the existing tests stay green and
  untouched, in particular `src/server/api.test.mjs` (the 404 and 200 cases
  for `/api/intent/<id>`, including the id guard that runs before the queue)
  and `src/core/layout.test.mjs` (columns, picker groups). Characterisation
  first: a unit test of `findInQueue` as it is today, written before the move,
  is the one new test; `repo.mjs`'s shape check (`:93`) already has a test for
  a malformed queue.
- **Why now:** it is the leftover from §1's KonMari step, it removes the one
  duplicated rule in the new code, and it puts the lookup where `§4`'s page
  test and any later code can reuse it. Nothing is blocked on it.

## Assumptions I made

- The owner's "write … a third one for the konmari findings" means both
  proposals in `konmari.md`, as one refactor, since they touch the same few
  lines (`QUEUE_GROUPS` is what `findInQueue` iterates).
- The picker-titles question is included as an open item for the plan to
  answer, not decided here. The owner may prefer to leave it out and keep this
  to the two folds.
- A refactor is the right type: no new behaviour, behaviour held constant by
  existing tests. If the plan finds a title change is needed, that part
  becomes a feature or an adjustment.
- The other items KonMari looked at and left (the doubled `GIT_OPTIONAL_LOCKS`
  literal, the two `send` calls, the fixture-repo helpers, the `engines`
  reflow) stay left: each was judged "about as much as it removes" or a
  different reason to change.
- No `blocked_by`. It is related to §4 (which may call `findInQueue`) and to
  §1 (its source); recorded under links.
