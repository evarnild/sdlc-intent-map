<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §6 — The queue-shape test proves every group key and leaves no lint disable

**Type:** adjustment
**Originator:** a review finding (the owner asked for this intent after §5 shipped)
**Source:** `intents/5-queue-groups-one-home/review.md` (round 2), LOW-1;
merged in `991938c`

## Problem

`src/server/queue-shape.test.mjs` (21 lines, added by §5 to kill mutant M17)
has three small defects, all in that one file. Round 2's review reports them
as "LOW-1 … three small problems with one fix":

- **A lint disable.** Line 13 reads `const { other, ...noOther } = all; //
  eslint-disable-line no-unused-vars`. The review says it "is the only disable
  comment in `src/`, `bin/` and `scripts/`, and `REVIEW-POLICY.md:30` lists
  such comments as a lint-guardrail item" (a new one in `src/` is on the
  Reviewed tier's path list). I confirmed it is still the only one on `main`
  (`bfcaee1`).
- **A claim the test does not prove.** Its header says "every group key in
  the core's QUEUE_GROUPS must be an array", but it builds exactly one broken
  queue: the one without `other`.
- **A surviving mutant.** Because of that, the review's M19 survives the whole
  suite: replacing the shape check at `src/server/repo.mjs:93`'s
  `QUEUE_GROUPS.every` with `QUEUE_GROUPS.slice(1).every` (it then stops
  checking `inFlight`) leaves all 107 product tests passing. The review adds
  that this gap "was on `main` before this change … so it is not a
  regression".

## Outcome

- `src/server/queue-shape.test.mjs` proves the shape check for each of the
  five keys: for every key in `QUEUE_GROUPS`, a queue printing the other four
  is rejected as "not a queue" (502), and a queue printing all five is
  accepted.
- The file contains no `eslint-disable` comment, and `grep -rn "eslint-disable"
  src bin scripts` finds none.
- Mutant M19 (and the same change for any other single key) is killed by this
  test; the existing M17 (`['inFlight','queued','shipped','stopped'].every`) and
  M20 (`.some`) stay killed.
- Nothing else changes: not `src/server/repo.mjs`, not any other test.

## Constraints

- **Tests only.** One test file. No source line in `src/core/`, `src/server/`
  or `src/web/` changes (`CORE_CODE` is `src/core/`, so this is not core code).
- **The test must not get weaker.** It keeps every assertion it has today
  (the `other` case, the 502 status, `/not a queue/`, and that a full queue is
  accepted and `other` comes back as `[]`).
- **No new lint suppression**, no raised warning cap, no new dependency.
- **Cost:** each case builds a throwaway git repo through
  `src/test/fixture-repo.mjs`; the five cases should reuse one fixture (commit
  a new `scripts/queue.mjs` each time) so the file does not add more than a few
  seconds to `npm run test:app`.
- **No real data:** the fixtures are made-up queues in a temp directory.
- **Tier:** left to the path table: `src/**` and tests-only changes are
  Attested (`REVIEW-POLICY.md`); removing a disable comment does not raise it.

## Type-specific questions

### Adjustment
- **Exactly what changes:** `src/server/queue-shape.test.mjs`. Loop the test
  over `QUEUE_GROUPS` (imported from `../core/queue.mjs`), and build each
  fixture queue without destructuring, as the review suggests:
  `Object.fromEntries(Object.entries(all).filter(([k]) => k !== key))`. That
  removes the comment, makes the header true and kills M19. The header comment
  is reworded only if the loop changes what it says.
- **Blast radius:** 1 file, about 10 to 20 lines, no core code. Within 5 files
  and 60 lines.

## Assumptions I made

- **The loop reads the keys from the core's `QUEUE_GROUPS`** (the single home
  §5 created) and not from a literal list in the test, so a sixth key added
  later is covered automatically. If the owner prefers a literal list (a test
  that fails when the list changes), that is a small change in the same file.
- **Mutating all five keys** is the intended proof; the review names only M19
  (`inFlight`). The implementer shows the other keys the same way, with the
  mutant list written outside the work tree and run with `npm run mutate` once
  §3 has merged, or with a hand harness before.
- **The intent is not blocked by §3.** It can be built and reviewed without
  `npm run mutate`; the command only makes the mutant check shorter.
- **No `blocked_by` recorded.** Related work (§5, the source) is under links.
- The review's other note (a pre-existing gap: the shape check had no test for
  a missing `inFlight` before §5) is the same gap as M19, so one intent covers
  both.

## Progress

- 2026-11-25, commit b4d063b: `src/server/queue-shape.test.mjs` now loops over
  `QUEUE_GROUPS` (from `../core/queue.mjs`), builds each queue without one key
  via `Object.fromEntries(Object.entries(all).filter(...))`, asserts 502 and
  `/not a queue/` for each, then accepts the full five-key queue (`other` is
  `[]`). One fixture, one commit per case. The `eslint-disable-line` is gone;
  `grep -rn "eslint-disable" src bin scripts` finds nothing. No source file
  changed.
- Mutants in `src/server/repo.mjs` line 93 (probes only, restored by copy),
  each run against the new test file: `slice(1)` (drops inFlight, M19) KILLED;
  `slice(0,4)` (drops other) KILLED; filtering out queued, shipped, stopped
  one at a time: each KILLED; `.some` instead of `.every` KILLED.
- Tests: `npm run verify` green; product suite 107 tests, 107 pass (the one
  test was widened, not added).
