<!-- generated-by: sdlc-intent-map/build-plan@0.3.0 -->
# §5 plan — The queue's groups and the queue lookup each have one home, in the core

Intent: [intent.md](intent.md)

Approved before any code exists. If the plan turns out wrong mid-execution,
stop, fix the plan, and re-approve — don't push through.

## Goal

Make the queue's five group keys appear once, in `src/core/`, and move
`findInQueue` out of the I/O layer into the core with a unit test, with no
change in what the server answers or what the page shows. Settle the picker
titles question as the owner decided it (below): the titles stay as the
page's own wording in the core, and the duplication with `scripts/queue-lib.mjs`
is recorded as an exception in `docs/architecture.md`.

**The owner's decision on the open question** (conversation of 2026-11-25,
answering the `/auto 5` stop "plan found the spec incomplete", options 1/2/3):
"1 for the §5 /auto 5" — option 1: keep the titles in the core as the page's
own wording and record the duplication as an exception in
`docs/architecture.md`. Not option 2 (the server passes titles through the API)
and not option 3 (an exception for the core to import `scripts/`).

## Risks

- **Pass 9 lists no repository footguns yet**, so these are this change's own.
- **A refactor that changes behaviour.** The group order is observable: the
  picker lists groups in the order inFlight, queued, shipped, stopped, other,
  and `findInQueue` returns the first hit in that order. Deriving the key list
  from the picker's list must keep both orders exactly; a test on the order
  guards it.
- **Moving a test along with its code.** The characterisation test for
  `findInQueue` is written against the server's export first and moved with
  the function; the move must not weaken it. Only its import line changes.
- **A new core file that breaks the layering test.**
  `src/architecture.test.mjs` fails when `src/core/` imports from the server,
  the page or `node:`; the new module must import nothing (tests are exempt,
  `src/architecture.test.mjs:46`).
- **The page serves `src/core/*` by a fixed route**
  (`src/server/static.mjs:16`, `/core/` → `src/core`); a new file there is
  served without a route change, but `static.test.mjs` scans `src/core` for
  external URLs, so the new file must pass that too.
- **Tests that pass whatever the code does.** The new lookup test needs a
  queue where the same id could be found in two groups' neighbours, an id in
  the *last* group (`other`), a string id, and an empty queue, so a loop that
  stops early or skips a group is caught.
- **Stale line citations.** Line numbers below were read at `a651d7a`.

## Verified against the codebase

Re-read on `main` at `a651d7a`.

- `src/server/repo.mjs:20` — `const QUEUE_GROUPS = ['inFlight', 'queued',
  'shipped', 'stopped', 'other'];`.
- `src/server/repo.mjs:93` — `!QUEUE_GROUPS.every((g) => Array.isArray(data[g]))`
  in `readQueue`'s shape check (error "scripts/queue.mjs printed JSON that is
  not a queue", status 502).
- `src/server/repo.mjs:100-107` — `export function findInQueue(queue, id)`
  loops `QUEUE_GROUPS`, `queue[g].find((i) => i.id === id)`, returns the hit or
  `null`.
- `src/server/repo.mjs:11-12` — the server already imports from the core
  (`chooseFolder, chooseRef` from `../core/docref.mjs`, `DOCS` from
  `../core/hash.mjs`), so a further core import is the same layer direction.
- `src/server/server.mjs:4,49` — `import { checkRepo, findInQueue, readIntent,
  readQueue, RepoError } from './repo.mjs';` and `findInQueue(queue,
  Number(m[1]))`. No test imports `findInQueue` directly (grep of `src/**/*.test.mjs`).
- `src/core/layout.mjs:47-58` — `pickerGroups(queue)`: the local `groups`
  array `[['inFlight','In flight'], ['queued','Queued'], ['shipped','Shipped'],
  ['stopped','Stopped'], ['other','Other']]`, mapped to `{ key, title, items }`
  and filtered to non-empty groups. `src/core/layout.test.mjs:188-` tests it.
- `src/server/api.test.mjs:136-150,212-218` — the HTTP tests that hold behaviour
  constant: 404 for an id not in the queue, 404 for anything that is not a
  plain number, 404-not-502 when `queue.mjs` fails.
- `src/architecture.test.mjs:46` — core files other than `*.test.mjs` are
  scanned: no imports from the server, the page or `node:`.
- `docs/architecture.md:82-86` — "Recorded exceptions" table with one row;
  principle 4 (`:46`) "One source of truth. A rule, a number or a prompt has
  one home, and anything showing it reads from there."; principle 12 (`:79`)
  "Structural decisions are written down."
- `CLAUDE.md:154-` — the Architecture section's `src/core/` bullet lists
  `layout.mjs`, `hash.mjs`, `docref.mjs`.
- `scripts/queue-lib.mjs:11-16` — `GROUPS` with the queue's own titles ("In
  flight", "Queued", …): the source the exception row names. The core cannot
  import it (principle 2), and the target repo's `queue.mjs --json` output
  carries no titles.

## Where this goes

- **Modules touched:** `src/server/repo.mjs` (drop `QUEUE_GROUPS` and
  `findInQueue`, import the group keys from the core), `src/server/server.mjs`
  (import `findInQueue` from the core), `src/core/layout.mjs` (`pickerGroups`
  reads the shared list), `docs/architecture.md` (one exception row),
  `CLAUDE.md` (one bullet naming the new module).
- **New modules:**
  - `src/core/queue.mjs` — pure: the queue's five groups, in order, with the
    picker's titles (`GROUPS`), their keys (`QUEUE_GROUPS`), and `findInQueue`.
  - `src/core/queue.test.mjs` — its unit tests.
- **Why there:** principle 4 puts the group list in one place, and principle 3
  and 9 put the lookup, which is pure logic, in the core with a unit test of
  its own. A separate `queue.mjs` keeps `layout.mjs` to the board's drawing
  (principle 6) and gives the list and the lookup one home both layers import.
  Direction stays `bin/` → `src/server/` → `src/core/` (principle 2).
  The titles stay in the core as the page's own wording; their duplication
  with `scripts/queue-lib.mjs` is the recorded exception (principle 12), per
  the owner's decision above.
- **Budget lines:** none (no file near 500 lines).

## Subtasks

1. **Characterise first.** Add `src/server/repo.test.mjs` with tests of
   `findInQueue` as it is today, imported from `./repo.mjs`: found in each of
   the five groups, found in the last group when an earlier group is empty,
   a numeric id that is not present, a string id that equals a numeric one
   (returns `null`, since `===`), an empty queue, and the group order (an id
   present in two groups returns the earlier group's record). Green on
   unchanged code; commit.
2. **One home.** Create `src/core/queue.mjs` with `GROUPS`, `QUEUE_GROUPS`
   (derived from `GROUPS`) and `findInQueue`; `pickerGroups` reads `GROUPS`;
   `repo.mjs` imports `QUEUE_GROUPS` for the shape check; `server.mjs` imports
   `findInQueue` from the core; remove the old definitions. Move
   `src/server/repo.test.mjs` to `src/core/queue.test.mjs` changing only its
   import line (and add one test that `QUEUE_GROUPS` equals the five keys in
   order and `pickerGroups` lists them in that order). No other test changes.
3. **Write it down.** Add the exception row to `docs/architecture.md`; add
   `queue.mjs` to the `src/core/` bullet in `CLAUDE.md`; set `status:
   in-review`.

## Tests

| Behaviour | Test | Would fail if |
| --- | --- | --- |
| `findInQueue` finds an intent in each group | `src/core/queue.test.mjs` (five cases) | a group is skipped, or the loop stops early |
| earlier group wins when an id is in two | `queue.test.mjs` | the order changes |
| absent id, string id, empty queue give `null` | `queue.test.mjs` | the comparison loosens (`==`) or a missing group throws |
| `QUEUE_GROUPS` order and keys | `queue.test.mjs` | a key is added, dropped or reordered |
| picker lists groups in that order with the picker's titles | the existing `layout.test.mjs` (untouched) plus the one assertion in `queue.test.mjs` | `pickerGroups` stops reading the shared list |
| server answers the same: 404 for an unknown or non-numeric id, 200 with the record for a known one, 502 for a malformed queue | the existing `api.test.mjs` (untouched) | `repo.mjs` or `server.mjs` is wired wrong |
| the core stays pure | the existing `architecture.test.mjs` (untouched) | `queue.mjs` imports from the server, the page or `node:` |

No existing test is edited, deleted or loosened. No model calls, no external
APIs.

## Validation

- `npm run verify` green.
- `npm run check:intent` PASS (type refactor: no test line deleted).
- `npm run size:baseline` prints `{}`.
- **Live check (owed by rule 1: `src/server/**` changes):** the owner, in the
  worktree, runs `npm start -- C:/Users/eric/src/heraklios`, opens
  `http://localhost:5300/`, and checks: the picker lists the same groups in
  the same order as before ("In flight", "Queued", "Shipped", …); a counter
  and a shipped row each open the reader; `#i-<an in-flight id>-plan` opens
  that plan; `#i-999` shows "No intent §999 in this repo". Nothing should
  look different from §1's check.

## Assumptions I made

- The owner's answer "1 for the §5 /auto 5" is option 1 of the stop message
  (keep the titles in the core as the page's wording, record the exception).
- The shared list lives in a new `src/core/queue.mjs` and not in
  `layout.mjs`: the intent allowed either ("the existing `layout.mjs`, or a new
  `queue.mjs` module"), and the plan picks the one that keeps `layout.mjs` to
  drawing.
- The exception row says: the picker's group titles repeat
  `scripts/queue-lib.mjs`'s `GROUPS` titles; principle 4; the core may not
  import `scripts/` (principle 2) and the target repo's queue JSON carries no
  titles.
- A string id returning `null` is today's behaviour (`i.id === id`, with the
  caller passing `Number(m[1])`), and is kept, not "fixed".
- No new dependency.

## Progress

<!-- The implementer appends here, one entry per phase: date, commits, what
shipped, test counts, anything that diverged from the plan. Nothing above
this line is the implementer's to edit. -->

### 2026-11-25 - subtasks 1 to 3

- Commits: eb2721c (characterise findInQueue), 71a2cba (move to src/core/queue.mjs), and the §5 commit that records the exception, updates CLAUDE.md and sets in-review.
- Shipped: `src/core/queue.mjs` (`GROUPS`, `QUEUE_GROUPS`, `findInQueue`); `pickerGroups`, `repo.mjs` and `server.mjs` read from it; the characterisation test moved to `src/core/queue.test.mjs` (import line only changed, plus the one order test); exception row in docs/architecture.md; CLAUDE.md names the module.
- Tests: kit 376 pass; app 106 pass (was 105 before the one added order test; the 11 characterisation tests moved, not added).
- Divergences: none. The picker-order assertion lives in queue.test.mjs (imports `pickerGroups` from layout.mjs), as the plan said.
