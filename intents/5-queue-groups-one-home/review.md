<!-- generated-by: sdlc-intent-map/review@0.3.0 -->
# §5 review — The queue's groups and the queue lookup each have one home, in the core

verdict: escalate
tier: reviewed
reviewed-commit: bc83beba725683f4f95b1d10bdda73cad303a9bf
round: 2
sampled: no
run: auto
live-check: owed

Tier: the path table alone gives **Attested** (`src/core/**`, `src/server/**`;
`docs/**` and `intents/**` are Automated). Round 1 raised it to **Reviewed**
with a HIGH finding (`REVIEW-POLICY.md` → Tiers, input 3), and nothing lowers
a tier. The diff also adds a new `eslint-disable-line` comment in `src/`
(`src/server/queue-shape.test.mjs:13`), which `REVIEW-POLICY.md:30` lists as a
Reviewed item by path. So the tier is Reviewed and the owner reads the diff.
No finding in this round needs rework, so the verdict is `escalate`.

## Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | pass. HIGH-1 is resolved: `repo.mjs:13` imports `QUEUE_GROUPS` from `../core/queue.mjs` and its local list is gone. All three subtasks are done. The new `src/server/queue-shape.test.mjs` is an addition the plan did not list; it is test-only and was asked for by round 1's M17 |
| 2 | Type check | pass. FAIL, and its only error is the owed live check, which is the owner's gate |
| 3 | Behaviour against the spec | pass. A refactor has no spec. Behaviour is held constant: no test file that exists on `main` changed (`git diff main...HEAD -- '*.test.mjs'` shows only the two new files; `api.test.mjs` and `layout.test.mjs` have no commits on the branch). `findInQueue` moved verbatim. The shape check at `repo.mjs:93` is textually unchanged and now reads the same five keys from the core |
| 4 | Tests prove the behaviour, not only pass | findings (1): LOW-1. M3, M4, M5, M17 and M20 are killed. M19 survives, but it mutates an unchanged line and round 1 noted it as pre-existing. M18 survives as an equivalent mutant |
| 5 | Conventions (CLAUDE.md) | pass. The core imports nothing forbidden, the server imports the core (allowed direction), the new test uses the fixture repo so no real repo is touched |
| 6 | Numbers in prose | pass. Reproduced: app 107 pass, kit 376 pass, `size:baseline` prints `{}`. The Progress line "M5 … killed by 3 tests" was true before `queue-shape.test.mjs` existed; at HEAD M5 is killed by 4 tests, which fits the entry's own order of events |
| 7 | Documentation | pass. The LOW-1 rewording is in `docs/architecture.md:87`, and `CLAUDE.md` names `queue.mjs` |
| 8 | Guardrails and hygiene | findings (1): LOW-1, the new disable comment. Lint is clean, `eslint.config.mjs` and `package.json` are unchanged, no new dependency, no secret, no new shell, eval or HTML sink |
| 9 | Repository footguns | pass (the list is empty) |
| 10 | Architecture | pass. Principle 4 now holds for the keys and their order (one home, `src/core/queue.mjs`). The title duplication is the recorded exception, worded accurately |

## Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: FAIL (intent 5, refactor)
  error: A live check is owed and not recorded. Do the steps in intents/5-queue-groups-one-home/review.md → ## Live check, then set live_checked: <date> in intents/5-queue-groups-one-home/metadata.yml.
  note:  8 file(s), 127 line(s) changed outside intents/.
```

The only error is the owed live check, which the owner clears; it is not
rework. No other error appears. `npm run verify` (worktree, HEAD bc83beb)
exited 0: lint clean, `test:kit` 376 pass and 0 fail, `test:app` 107 pass and 0
fail.

## Round 1 findings, at HEAD

- **HIGH-1: resolved.** `src/server/repo.mjs:13` is `import { QUEUE_GROUPS } from '../core/queue.mjs';`. The local `const QUEUE_GROUPS = [...]` is deleted: grep finds only `:13` (import) and `:93` (use). The exception row's claim that "the group keys and their order have one home" is now true, and the Progress entry has an appended correction line.
- **MEDIUM-1: resolved.** `src/core/queue.test.mjs:51` asserts the literal titles `['In flight', 'Queued', 'Shipped', 'Stopped', 'Other']`. M3 and M4 are now killed.
- **LOW-1: resolved.** `docs/architecture.md:87` now reads "repeat four of the five titles in `scripts/queue-lib.mjs` `GROUPS` (the page says 'Other' where the kit says 'Unrecognised status')".
- **LOW-2: unchanged, as expected.** `plan.md:83` still cites `scripts/queue-lib.mjs:11-16`. That line is above the Progress marker, so it was not the implementer's to fix; it was only "worth a look".
- **Nit** (principle 1 parenthetical, `docs/architecture.md:25`): not taken; it was optional.
- **M14: gone.** The line it mutated (`repo.mjs:20`, the local list) no longer exists.

## Findings

- **LOW-1** `src/server/queue-shape.test.mjs:1,13` — the new test file has three small problems with one fix.
  - (a) It adds a new `// eslint-disable-line no-unused-vars` in `src/`. It is the only disable comment in `src/`, `bin/` and `scripts/`, and `REVIEW-POLICY.md:30` lists such comments as a lint-guardrail item. It is easy to avoid.
  - (b) Its header says "every group key in the core's QUEUE_GROUPS must be an array", but it only proves `other`.
  - (c) Because of (b), M19 survives: the shape check is `QUEUE_GROUPS.slice(1).every` at `repo.mjs:93`, so a queue missing `inFlight`, `queued`, `shipped` or `stopped` is accepted. This gap was on `main` before this change (round 1 noted it as a residual) and the line is unchanged, so it is not a regression.

  Fix: loop the test over the five keys and build each fixture without destructuring, for example `Object.fromEntries(Object.entries(all).filter(([k]) => k !== key))`. That removes the disable comment, makes the header true and kills M19. Worth a look: the owner reads the diff (Reviewed) and can fold it in before merging or leave it for a later pass. It is not required by the intent, the plan or round 1.

## Mutants (reviewer: each against `node --test "src/**/*.test.mjs"`, one at a time)

Each file was backed up by copy, one occurrence replaced (the harness aborts
unless there is exactly one match), `git diff --quiet` checked non-zero, the
suite run, the file restored by copy; `git status --short` was empty each time.

| id | file:line | change | result | killed by |
| --- | --- | --- | --- | --- |
| M3 | `src/core/queue.mjs:7` | `'In flight'` → `'In Flight'` | killed | queue.test.mjs "QUEUE_GROUPS is the five keys in the picker's order…" (literal-title assertion) |
| M4 | `src/core/queue.mjs:9` | `'Shipped'` → `'Recently shipped'` | killed | same test |
| M5 | `src/core/queue.mjs:11` | drop `{ key: 'other', … }` | killed (4 fails) | findInQueue in other; last-group test; order test; queue-shape.test.mjs |
| M14 | `src/server/repo.mjs:20` (round 1) | n/a | gone | the line no longer exists |
| M17 | `src/server/repo.mjs:93` | `QUEUE_GROUPS.every` → `['inFlight','queued','shipped','stopped'].every` | killed | queue-shape.test.mjs |
| M18 | `src/server/repo.mjs:13` | import replaced by a local five-key `const QUEUE_GROUPS` | survived (equivalent) | none: it re-creates the duplication without changing behaviour, which no behaviour test can catch; principle 4 rests on review here |
| M19 | `src/server/repo.mjs:93` | `QUEUE_GROUPS.slice(1).every` (stop checking `inFlight`) | **survived** | none (LOW-1 (c); line unchanged by this diff, gap pre-existing) |
| M20 | `src/server/repo.mjs:93` | `.every` → `.some` | killed | queue-shape.test.mjs |

How strong the new test is (each run on the unmutated code, test file
restored by copy): T1, the fixture writing `scripts/queue-x.mjs` instead of
`scripts/queue.mjs`, makes the test fail (it cannot pass vacuously on a wrong
path); T2, the first fixture printing `all` instead of `noOther`, makes it
fail; T3, the expected message `/not a queue/` → `/did not print JSON/`, makes
it fail (it pins the shape-check error, not just any 502).

## Not checked

- **The page in a browser.** `src/web/app.mjs` renders `pickerGroups`. The titles and order are proven in the core, but the rendered picker was not looked at; that is the owner's live check.
- **The server against a real repository.** Not started.
- **Missing-group behaviour past the shape check.** With M19 (a queue without `inFlight` accepted), what the server and page would do next was not traced (likely a throw in `findInQueue` or `layout`). Pre-existing and not exercised.
- **Round 1's M1, M2, M6–M13, M15 and M16:** not re-run. The lines they mutate are unchanged since 1074e37 apart from the added test assertion, which only strengthens them. Taken on trust from round 1.
- The kit suite per test: run once inside `verify`; no kit mutants, since the diff touches no `scripts/` file.

## Live check

- **Owed:** rule 1. The diff touches `src/server/**` (`repo.mjs`, `server.mjs`). It also covers the Not-checked items "the page in a browser" and "the server against a real repository".
- **Steps:** (1) in the worktree `C:/Users/eric/src/sdlc-intent-map-wt/5-queue-groups-one-home`, run `npm start -- C:/Users/eric/src/heraklios`; (2) open `http://localhost:5300/`; (3) open the picker and compare its groups with §1's check; (4) click a counter, then a shipped row; (5) visit `http://localhost:5300/#i-<an in-flight id>-plan`; (6) visit `http://localhost:5300/#i-999`; (7) stop the server with Ctrl+C.
- **You should see:** the page loads with no error banner (so the shape check accepted the real queue); the picker lists the non-empty groups in the order "In flight", "Queued", "Shipped", "Stopped", "Other", with the same titles as before; the counter and the shipped row each open the reader on that intent; `#i-<in-flight id>-plan` opens that intent's plan; `#i-999` shows "No intent §999 in this repo"; nothing looks different from §1's check.

## Verified myself vs. taken on trust

Verified myself (reviewer; worktree at HEAD bc83beb on `refactor/5-queue-groups-one-home`, nothing checked out; `main` at 46c17c8, untouched; nothing pushed):
- `npm run verify` exit 0 (kit 376/376, app 107/107); `npm run check:intent` exit 1, only the owed-live-check error; `npm run size:baseline` `{}`; `npm run sdlc:scan -- --sample-due auto --exclude 5` → `sampled: no`.
- `git diff 1074e37 bc83beb` shows exactly the rework (the import and deletion in `repo.mjs`, one test assertion, the new queue-shape test, the docs row, a Progress append, `auto_round: 2`); nothing above the Progress marker changed.
- `QUEUE_GROUPS` appears in `src/server/` only at `repo.mjs:13` (import) and `:93` (use); `server.mjs:6` imports `findInQueue` from the core; the only `eslint-disable` in `src`, `bin` and `scripts` is `queue-shape.test.mjs:13`.
- Mutants M3, M4, M5, M17, M18, M19, M20 and T1–T3 as tabled.

**Coordinator, re-run** (worktree at bc83beb, sequentially):
- `npm run verify`: exit 0; `test:kit` 376 pass, 0 fail; `test:app` 107 pass, 0 fail. Matches.
- `npm run check:intent`: FAIL with only "A live check is owed and not recorded", note "8 file(s), 127 line(s) changed outside intents/". Matches.
- The mutants, each against `node --test "src/**/*.test.mjs"` with backup and restore by copy, `git status --short` empty afterwards: **M3 killed**, **M4 killed**, **M5 killed** (by the findInQueue-in-other test, the last-group test and the order test), **M17 killed** (by queue-shape.test.mjs), **M20 killed** (same), **M18 survived**, **M19 survived**. Matches the reviewer for all seven, including the two expected survivors.

Taken on trust:
- Round 1's M1, M2, M6–M13, M15, M16, and the reviewer's T1–T3 probes of the new test.

# Round 1 (history)

## §5 review — The queue's groups and the queue lookup each have one home, in the core

verdict: rework
tier: reviewed
reviewed-commit: 1074e371c88d2b011a6c54cc99521ad9332633a1
round: 1
sampled: no
run: auto
live-check: owed

Tier: the path table gives **Attested** (`src/core/**` and `src/server/**`;
`docs/**` and `intents/**` are Automated; `CLAUDE.md` is not on the Reviewed
list). `review_tier:` is empty and the type is refactor, so neither raises it.
**The report raises it to Reviewed**: it has one HIGH finding, and
`REVIEW-POLICY.md` → Tiers, input 3 says "Any CRITICAL or HIGH finding
escalates to Reviewed". Nothing lowers it afterwards.

### Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | findings (1): the HIGH below. Subtask 2 is only partly done |
| 2 | Type check | pass (PASS, refactor) |
| 3 | Behaviour against the spec | pass: a refactor has no spec. Behaviour is held constant: no test file that exists on `main` was edited or deleted (`api.test.mjs`, `layout.test.mjs` untouched and green); `findInQueue` keeps strict `===`, group order and `null`; the picker's order and titles are the same text as on `main` |
| 4 | Tests prove the behaviour, not only pass | findings (2): M3 and M4 (picker titles) and M14 (the duplicate key list) survived |
| 5 | Conventions (CLAUDE.md) | pass |
| 6 | Numbers in prose | pass: the product suite's 106 reproduces; "was 105" is consistent (11 moved tests plus 1 added) |
| 7 | Documentation | findings (1): LOW-1, the exception row's wording; `CLAUDE.md` naming `queue.mjs` is accurate |
| 8 | Guardrails and hygiene | pass: lint clean, no change to `eslint.config.mjs` or `package.json`, no new dependency, no secret, no new shell, HTML or eval sink |
| 9 | Repository footguns | pass (the list is empty) |
| 10 | Architecture | findings (1): same root cause as the HIGH. Principle 4 is not met while `repo.mjs:20` keeps its own key list, and the new exception row claims it is met |

### Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: PASS (intent 5, refactor)
  note:  7 file(s), 103 line(s) changed outside intents/.
```

`npm run verify` (worktree, HEAD 1074e37): exit 0; lint clean; `test:kit` 376
pass, 0 fail; `test:app` 106 pass, 0 fail.

### Findings

- **HIGH-1** `src/server/repo.mjs:20` — the main outcome of the intent is not delivered. `repo.mjs` still declares its own `const QUEUE_GROUPS = ['inFlight', 'queued', 'shipped', 'stopped', 'other'];` and uses it in the shape check at `:93`, so the five keys are still written twice, once there and once in `src/core/queue.mjs:6-12`. The intent's outcome asks for an exported list "that `layout.mjs` … and `repo.mjs` (the shape check and the lookup) both read"; the plan's "Where this goes" says `repo.mjs` should "drop `QUEUE_GROUPS` … import the group keys from the core", and subtask 2 says "`repo.mjs` imports `QUEUE_GROUPS` for the shape check". The implementer's Progress entry says "`pickerGroups`, `repo.mjs` and `server.mjs` read from it", which is false: `repo.mjs` has no import from `../core/queue.mjs` (the coordinator confirmed this by grep). The diff to `repo.mjs` only removes `findInQueue`. The new exception row at `docs/architecture.md:87` also says "the group keys and their order have one home, `src/core/queue.mjs`", which is untrue at this commit. Mutant M14 shows the copy can drift with nothing failing. Needs rework: delete `repo.mjs:20` and add `import { QUEUE_GROUPS } from '../core/queue.mjs';` next to the other core imports (`:11-12`); then correct the Progress entry (append a corrected line; the earlier text is the implementer's own record).
- **MEDIUM-1** `src/core/queue.test.mjs:50` — the picker titles are not proven. The plan's test table says "picker lists groups in that order with the picker's titles", but the only title assertion compares `pickerGroups(q)` titles with `GROUPS` titles; because `pickerGroups` reads `GROUPS` this is a tautology for any change to a title, and `layout.test.mjs:188-193` asserts keys only. M3 (`'In flight'` → `'In Flight'`) and M4 (`'Shipped'` → `'Recently shipped'`) survived the whole product suite. The titles at HEAD are the same text as on `main`; the gap existed on `main` too, but the move of the literals is exactly where a typo would slip through. Needs rework: in `queue.test.mjs`, also assert the literal titles: `assert.deepEqual(pickerGroups(q).map((g) => g.title), ['In flight', 'Queued', 'Shipped', 'Stopped', 'Other'])`. An addition to the new test file only; no existing test changes.
- **LOW-1** `docs/architecture.md:87` — the exception row says the picker titles "repeat the titles in `scripts/queue-lib.mjs` `GROUPS`". Only four of the five do: `scripts/queue-lib.mjs:25` titles `other` "Unrecognised status" and the page says "Other" (`src/core/queue.mjs:11`). The difference supports the row's own reason ("the page's own wording"), but the row is inaccurate as written. Needs rework: reword to "…repeat four of the five titles in `scripts/queue-lib.mjs` `GROUPS` (the page says 'Other' where the kit says 'Unrecognised status')". The principle numbers are right: 4 as the principle excepted, 2 as the reason the core cannot import `scripts/`.
- **LOW-2** `intents/5-queue-groups-one-home/plan.md:83` — the plan cites `scripts/queue-lib.mjs:11-16` for `GROUPS`, which is at `:20-26`. This line is above the Progress marker, so it is not the implementer's to edit. Worth a look; no rework.
- **Nit:** the principle 1 parenthetical in `docs/architecture.md:25` ("board layout, hash parsing, document-ref choice") could name the queue lookup.

A residual that predates this change, not a finding against it: dropping a key
from the shape check (`repo.mjs:93`, for example `QUEUE_GROUPS.slice(0, 4).every`)
is probably unpinned by the malformed-queue test. Not run, since the line is
unchanged by this diff.

#### Mutants (reviewer: each against `node --test "src/**/*.test.mjs"`, one at a time)

| id | file:line | change | result | killed by |
| --- | --- | --- | --- | --- |
| M1 | `src/core/queue.mjs:7-8` | swap the inFlight/queued entries | killed | QUEUE_GROUPS order test |
| M2 | `src/core/queue.mjs:8` | key `'queued'` → `'queue'` | killed | 14 tests |
| M3 | `src/core/queue.mjs:7` | title `'In flight'` → `'In Flight'` | **survived** | none |
| M4 | `src/core/queue.mjs:9` | title `'Shipped'` → `'Recently shipped'` | **survived** | none |
| M5 | `src/core/queue.mjs:11` | drop the `other` entry | killed | findInQueue in other, last-group test, order test |
| M6 | `src/core/queue.mjs:14` | `QUEUE_GROUPS` reversed | killed | earlier-group-wins test, order test |
| M7 | `src/core/queue.mjs:18` | loop over `QUEUE_GROUPS.slice(0, 4)` | killed | findInQueue in other, last-group test |
| M8 | `src/core/queue.mjs:19` | `===` → `==` | killed | strict-compare test |
| M9 | `src/core/queue.mjs:20` | `if (hit) return hit;` → `if (hit) break;` | killed | 12 tests |
| M10 | `src/core/queue.mjs:22` | `return null` → `return undefined` | killed | absent, string-id and empty-queue tests |
| M11 | `src/core/layout.mjs:50` | `GROUPS.slice(0, 4)` | killed | QUEUE_GROUPS order test |
| M12 | `src/core/layout.mjs:51` | `title: key` | killed | QUEUE_GROUPS order test (title assertion) |
| M13 | `src/core/layout.mjs:50` | `[...GROUPS].reverse()` | killed | layout pickerGroups (B19), order test |
| M14 | `src/server/repo.mjs:20` | drop `'other'` from the local list | **survived** | none |
| M15 | `src/server/server.mjs:6` | wrap the import so it passes `String(id)` | killed | 5 `api.test.mjs` cases |
| M16 | `src/server/server.mjs:6` | wrap the import so it ignores `inFlight` | killed | `api.test.mjs`: unmerged-intent-from-branch and others |

Expected to be killed after the rework (the coordinator re-runs these):
- **M3** (`src/core/queue.mjs:7`) and **M4** (`:9`): by the literal-title assertion (MEDIUM-1).
- **M14**: the line it mutates is deleted by HIGH-1. Re-run it as M5 (`src/core/queue.mjs:11`, drop `other`) and a new **M17**, `src/server/repo.mjs`'s shape check no longer reading the core list: replace the added import's use `QUEUE_GROUPS.every` with `['inFlight', 'queued', 'shipped', 'stopped'].every`, which must be killed by a test (if none kills it, that is a finding for round 2).

### Not checked

- **The kit suite count** (376) in the Progress entry: the reviewer kept only the product suite's summary. The coordinator re-ran it (below).
- **The shape-check mutant at `repo.mjs:93`** (described above): the line is unchanged by this diff.
- **The page in a browser** (`src/web/app.mjs` reading `pickerGroups`): unchanged, but the rendered picker was not looked at. That is the owner's live check.
- **The server against a real repository:** not started.

### Live check

- **Owed:** rule 1, because the diff touches `src/server/**` (`repo.mjs`, `server.mjs`).
- **Steps:** after the rework, in the worktree `C:/Users/eric/src/sdlc-intent-map-wt/5-queue-groups-one-home`, run `npm start -- C:/Users/eric/src/heraklios` and open `http://localhost:5300/`. Then: (1) open the picker and compare its groups with §1's check; (2) click a counter, then a shipped row; (3) visit `#i-<an in-flight id>-plan`; (4) visit `#i-999`; (5) stop the server (Ctrl+C).
- **You should see:** the picker lists the same non-empty groups in the order "In flight", "Queued", "Shipped", "Stopped", "Other", with the same titles as before; the counter and the shipped row each open the reader on that intent; `#i-<an in-flight id>-plan` opens that intent's plan; `#i-999` shows "No intent §999 in this repo"; nothing looks different from §1's check.

### Verified myself vs. taken on trust

Verified myself (reviewer, worktree at 1074e37, own worktree, nothing checked out):
- `npm run verify` exit 0 (run twice, sequentially), product suite 106 pass; `npm run lint` exit 0; `npm run size:baseline` prints `{}`; `npm run check:intent` PASS.
- `git diff main...HEAD -- '*.test.mjs'` shows only the new `src/core/queue.test.mjs`; `src/server/repo.test.mjs` was created in `eb2721c` and renamed in `71a2cba`, and never existed on `main`.
- Titles and order are the same text in `layout.mjs` on `main` and in `queue.mjs` at HEAD; `findInQueue`'s body moved verbatim; `repo.mjs` has no import from `src/core/queue.mjs` (grep); `scripts/queue-lib.mjs:20-26` titles `other` "Unrecognised status".
- M1 to M16 as above, with a backup-by-copy harness; `git status --short` empty afterwards.
- `npm run sdlc:scan -- --sample-due auto --exclude 5`: "nth attested auto change = 1, every 3, sampled: no".

**Coordinator, re-run** (worktree at 1074e37, sequentially):
- `npm run verify`: exit 0; `test:kit` 376 pass, 0 fail; `test:app` 106 pass, 0 fail. Matches the reviewer and the implementer.
- `npm run check:intent`: PASS (intent 5, refactor), note "7 file(s), 103 line(s) changed outside intents/". Matches.
- The HIGH finding: `grep -n "QUEUE_GROUPS\|core/queue" src/server/repo.mjs src/server/server.mjs` shows `repo.mjs:20` (the local list), `:93` (its use), and the core import only in `server.mjs:6`. Confirmed.
- The surviving mutants, each against `node --test "src/**/*.test.mjs"`, restored by copy, `git status --short` empty afterwards: **M3 survived**, **M4 survived**, **M14 survived**. Matches the reviewer for all three.

Taken on trust:
- M1, M2, M5–M13, M15 and M16 as the reviewer reported them killed (the coordinator re-ran only the survivors).
