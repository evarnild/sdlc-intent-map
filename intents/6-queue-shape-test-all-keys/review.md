<!-- generated-by: sdlc-intent-map/review@0.3.0 -->
# §6 review — The queue-shape test proves every group key and leaves no lint disable

verdict: attest
tier: attested
reviewed-commit: 6a471e777c4ae1f4e042de8f22898049fcab42ee
round: 1
sampled: no
run: auto
live-check: not-needed

Tier: Attested, from the path table (`src/**` tests-only changes). Nothing in
this diff is on the Reviewed list: it removes a disable comment and adds none,
changes no `eslint.config.mjs`, cap, agent, skill, settings or enforcement
script, and touches nothing on the by-meaning list. No finding raises it.

## Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | pass |
| 2 | Type check | pass (PASS, adjustment) |
| 3 | Behaviour against the intent's outcome | pass |
| 4 | Tests prove the behaviour, not only pass | pass: all 7 targeted mutants killed; one pre-existing gap outside the diff, reported LOW below |
| 5 | Conventions (CLAUDE.md) | pass |
| 6 | Numbers in prose | pass |
| 7 | Documentation | pass: nothing to update (no behaviour, module or command changed) |
| 8 | Guardrails and hygiene | pass |
| 9 | Repository-specific footguns | pass (the list is empty) |
| 10 | Architecture | pass |

**Pass notes.**
- **Scope.** `git diff main...HEAD -- src` touches one file, `src/server/queue-shape.test.mjs` (+11/−4). The rest of the diff is `intents/6-queue-shape-test-all-keys/`: `intent.md` gains `## Progress`, `metadata.yml` gains `status: in-review` and `auto_round: 1`. `src/server/repo.mjs` is unchanged and no other test changed. `CORE_CODE` (`scripts/intent-check-lib.mjs:153`) is `/^src\/core\//`, so no core code is touched. Blast radius: 1 file, 15 lines, inside the adjustment's 5 files and 60 lines; `check:intent` agrees. It is really an adjustment: one test widened, no behaviour change.
- **The outcome, item by item.** (1) Every key is covered: the test loops `for (const key of QUEUE_GROUPS)` (imported from `../core/queue.mjs`), builds `Object.fromEntries(Object.entries(all).filter(([k]) => k !== key))`, commits it as `scripts/queue.mjs` and asserts `e.status === 502 && /not a queue/.test(e.message)`. (2) The failure message names the key (`a queue without ${key} must be rejected`). (3) A full queue is still accepted: after the loop it commits the full five-key queue and asserts `.other` deep-equals `[]`. (4) No lint disable is left: `grep -rn "eslint-disable" src bin scripts` finds nothing.
- **No weaker than `main`'s version.** Main asserted that the `other`-less queue is rejected with 502 and `/not a queue/`, and that a full queue is accepted with `other` equal to `[]`. Both are still there: `other` is one of the loop's iterations with the same predicate. A key dropped from `QUEUE_GROUPS` cannot silently shrink the loop, because `src/core/queue.test.mjs:47` pins `QUEUE_GROUPS` to the five keys; a key missing from the test's own `all` would make that iteration's queue the full queue, which is accepted, so the test would fail loudly.
- **One fixture, cleaned up.** A single `createFixture()` serves all six commits, with `fx.cleanup()` in `finally`. The test took 5.85 s inside the verify run on a loaded machine; main's version was not timed, so the added cost is not measured against a baseline (Not checked).
- **Conventions and architecture.** The test imports from `src/core/` (a server-side test may); it uses the temp fixture repo, makes no real-repo or network call, adds no dependency. No module moved and no layer was crossed; reading the keys from the core's `QUEUE_GROUPS` keeps the single home §5 created.

## Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: PASS (intent 6, adjustment)
  note:  1 file(s), 15 line(s) changed outside intents/.
```

## Findings

- **LOW** `src/server/repo.mjs:93` / `src/server/queue-shape.test.mjs` — a pre-existing gap on lines this change does not touch: nothing proves the `Array.isArray` half of the shape check. Weakening it to `data[g] !== undefined`, so that a queue printing `"inFlight": {}` or `"queued": "x"` passes, leaves the whole product suite green (mutant (a) below). The intent claims only that missing keys are rejected, so this is not rework. Worth a look: a follow-up adjustment could add one more case to the same loop or fixture, such as a queue whose `key` is `{}`, asserted to give 502 and `/not a queue/`.
- **LOW** `REVIEW-POLICY.md` → "Live checks", rule 1 — the rule's glob `src/server/**` literally matches a test file, while its own parenthetical defines the runtime paths as "the entry point, the HTTP server and its git and queue adapters, and the page". The reviewer read it by the parenthetical (see Live check), which also matches §2's precedent of `not-needed` for a diff with no runtime line. Worth a look: the owner may want the rule to say whether `*.test.mjs` under a runtime path counts. That would be a Reviewed-tier edit of the policy, not part of this change.

## Mutation results

Each mutant is a probe on `src/server/repo.mjs:93` (`QUEUE_GROUPS.every((g) => Array.isArray(data[g]))`): back up by copy, patch exactly that place (unique target checked), confirm the file changed, run `node --test src/server/queue-shape.test.mjs`, restore by copy.

| Mutant | Result | Killed by |
| --- | --- | --- |
| M19 `QUEUE_GROUPS.slice(1).every` (drops `inFlight`) | KILLED | "a queue without inFlight must be rejected" |
| `QUEUE_GROUPS.slice(0, 4).every` (drops `other`, as M17) | KILLED | "a queue without other must be rejected" |
| `filter((g) => g !== 'queued')` | KILLED | "a queue without queued must be rejected" |
| `filter((g) => g !== 'shipped')` | KILLED | "a queue without shipped must be rejected" |
| `filter((g) => g !== 'stopped')` | KILLED | "a queue without stopped must be rejected" |
| M20 `.some` instead of `.every` | KILLED | "a queue without inFlight must be rejected" (first iteration) |
| (b) `Array.isArray(data[g])` → `true` | KILLED | "a queue without inFlight must be rejected" |
| (a) `Array.isArray(data[g])` → `data[g] !== undefined` | **SURVIVED** this file, and the full `npm run test:app` (107/107) | none: no test prints a group key holding a non-array value; the one other shape-check test, `src/server/api.test.mjs:191`, prints `{"x": 1}`, where every key is undefined |

No mutant needs re-running by rework. The one survivor, (a), is pre-existing and reported only as "worth a look".

## Not checked

- Mutants beyond the brief: the probes ran against `queue-shape.test.mjs` alone, and the full `npm run test:app` for (a) only. The other seven were killed by this file, so the full suite cannot change their result.
- The added test cost: 5.85 s inside the verify run on a shared machine; main's 21-line version was not timed, so "no more than a few seconds" is plausible (one fixture, six commits) but not measured against a baseline.
- The implementer's mutant list was not checked against `npm run mutate`, which is not on `main` yet (§3); the reviewer's own probes replace it.

## Live check

Not needed. The diff changes no runtime code:
- **Rule 1:** its only non-intent file is a `node --test` file under `src/server/`. It is not loaded by `bin/intent-map.mjs`, the server or the page, so running the server would show nothing this diff changed. (See the second LOW: the owner can set it back to `owed`.)
- **Rule 2:** no `.claude/settings.json` change.
- **Rule 3:** no Not-checked item is runtime behaviour.

## Verified myself vs. taken on trust

Verified myself (reviewer; worktree at 6a471e7 on `adjust/6-queue-shape-test-all-keys`, nothing checked out):
- `git merge-base main HEAD` was e05f0ce, main's tip then; the commits are b4d063b (the test file only), 3a78448 (`intent.md` and `metadata.yml`) and 6a471e7 (`metadata.yml`). Nothing touched main or the remote; no remote-tracking branch exists for `adjust/6-…`.
- `npm run verify` (run once): exit 0, lint clean, `test:kit` 376/376, `test:app` 107/107; the widened test is ok 32 at 5852 ms. `npm run check:intent`: PASS (intent 6, adjustment), 1 file and 15 lines. `grep -rn "eslint-disable" src bin scripts`: no output, exit 1.
- The probes above, restoring `repo.mjs` by copy each time; `git status --short` empty afterwards. `npm run sdlc:scan -- --sample-due auto --exclude 6`: "nth attested auto change = 1, every 3, sampled: no".
- Numbers in prose: the intent's "21 lines" for the main file (`git show main:… | wc -l` gives 21), 107 tests and "15 lines" match.

**Coordinator, re-run** (worktree at 6a471e7, sequentially):
- `npm run verify`: exit 0; lint clean; `test:kit` 376 pass, 0 fail; `test:app` 107 pass, 0 fail. Matches.
- `npm run check:intent`: PASS (intent 6, adjustment), note "1 file(s), 15 line(s) changed outside intents/". Matches.
- `grep -rn "eslint-disable" src bin scripts`: no output, exit 1. Matches.
- The probes on `src/server/repo.mjs:93`, restored by copy: M19, drop-`other`, skip-`queued`, skip-`shipped`, skip-`stopped`, M20 and (b), each against `src/server/queue-shape.test.mjs`, all **KILLED**, each naming its key ("a queue without inFlight must be rejected", etc.); (a) against the full `src/**/*.test.mjs`: **SURVIVED**. Matches the reviewer for all eight. `git status --short` empty afterwards.
- `npm run sdlc:scan -- --sample-due auto --exclude 6`: `sampled: no`.

Taken on trust: nothing quoted here.

An adjustment never runs the KonMari step.
