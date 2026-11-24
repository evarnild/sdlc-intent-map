<!-- generated-by: sdlc-intent-map/review@0.3.0 -->
# §1 review — Stack, skeleton and a first intent map served on localhost from a repo

verdict: rework
tier: reviewed
reviewed-commit: 936272be10d236bca5b8cddd929a47033c0a81f3
round: 1
sampled: no
run: auto
live-check: owed

## Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | pass (small unplanned additions recorded in Progress: CSP, nosniff, 405, `pickerGroups`, extra REVIEW-POLICY wording; see LOW-3) |
| 2 | Type check | pass (PASS) |
| 3 | Behaviour against the spec | findings (2): performance line not met (HIGH-1); B20 doc fallback untested (MEDIUM-7) |
| 4 | Tests prove the behaviour | findings (7): 26 of 103 mutants survived; 13 of them need tests (HIGH-2, MEDIUM-1 to MEDIUM-6), the rest are equivalent or low-value (LOW-4) |
| 5 | Conventions (CLAUDE.md) | pass: git calls take argument arrays, tests use temp fixture repos and port 0, no model or external calls, the only `innerHTML` is the sanitised render |
| 6 | Numbers in prose | pass, with notes: test counts (374 kit, 82 product) and the `{}` baseline reproduce; Héraklios timings differ from Progress but the conclusion holds (HIGH-1); Héraklios column counts have moved since Progress |
| 7 | Documentation | findings (2): README.md stale (MEDIUM-8); intents/README.md and a spawn-intent comment stale (LOW-1) |
| 8 | Guardrails and hygiene | pass: lint clean; six dependencies pinned and justified in plan.md; all 110 lockfile entries resolve to registry.npmjs.org; no secrets or real user data; Markdown goes through DOMPurify only |
| 9 | Repository footguns | pass (the list is empty) |
| 10 | Architecture | findings (3): principle 1 claims *Enforced* but is only partly (MEDIUM-6); B20 logic sits in `src/web` (MEDIUM-7, principles 3 and 9); the recorded exception is missing from the exceptions table (LOW-2, principle 12) |

## Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: PASS (intent 1, feature)
  note:  30 file(s), 3471 line(s) changed outside intents/.
exit: 0
```

`npm run verify` (worktree, HEAD 936272b): exit 0. Lint clean. `test:kit`
374 pass, 0 fail. `test:app` 82 pass, 0 fail.

## Findings

- **HIGH-1** `src/server/server.mjs:48-51`, `src/server/repo.mjs:76` — **Opening an intent takes seconds, not the spec's 0.5 s.**
  Measured on Héraklios (read-only; `git status` and refs unchanged), under about 50 % CPU load from other sessions:

  | Request | Time |
  | --- | --- |
  | `node scripts/queue.mjs --json` | 3.95–4.44 s |
  | `npm run queue` | 5.40–8.24 s |
  | `GET /api/queue` | 4.04–5.22 s |
  | `GET /api/intent/73` | 3.77–3.89 s |
  | `GET /api/intent/81` | 3.24–3.27 s |
  | 404 for an unknown id | 3.27 s |

  Every `/api/intent/<id>` re-runs `queue.mjs` to check the id (B8) and report the queue's fields. A page load with a `#i-<id>-<doc>` link runs the queue twice, about 7–9 s. `/api/queue` meets its own line (within `npm run queue` + 0.5 s).

  Needs decision: pick one of these.
  - (a) `/api/intent` reuses the last queue result, kept until the repo's refs change (`git for-each-ref` plus `rev-parse main` costs tens of milliseconds). First confirm that `queue.mjs` reads only committed state. B5 stays literally true for `/api/queue`; B8's "current queue" changes meaning.
  - (b) `/api/intent` does not consult the queue. Either the page sends the record it already has, or the server finds the branch and folder directly and gives up B8's "fields as the queue reports them".
  - (c) Relax the spec's performance line for repos of Héraklios's size.

  Every option changes spec.md (B5, B8 or Non-functional).

- **HIGH-2** `src/core/layout.mjs:146-147` (test `src/core/layout.test.mjs:103`) — **The arrow path the page draws is not tested.** `app.mjs` draws `a.d`, but the tests only check `x1..y2` and that `d` matches `/^M /`. Mutants L29a (path ends at the source), L29b (straight path ends where it starts) and L29c (path starts at `0 0`) survive, so B14's "never start or end on the wrong counter" is unproven for what the user sees. Needs rework: assert that `d` starts with `M ${x1} ${y1}` and ends with `${x2} ${y2}`, for both the horizontal and the same-column case.

- **MEDIUM-1** `src/server/server.mjs:47` (test `src/server/api.test.mjs:138`) — **The digits-only id guard is not tested.** Removing or loosening it (S5a, S5b) passes, because `findInQueue` already 404s non-numbers, yet the plan's risk says the check runs "before anything else". Needs rework: in the failing-queue fixture (`api.test.mjs:180`), assert `/api/intent/abc` and `/api/intent/..%2F..` give 404, not 502, proving the guard runs before `queue.mjs`.

- **MEDIUM-2** `src/server/server.mjs:65` (test `api.test.mjs:153-163`) — **The Host check's exact match is under-tested.** `startsWith('localhost')` survives (S3b), and by reading a check that ignores the port would too (S3c, not run). Needs rework: assert 403 for `Host: localhost.evil.example:<port>`, `localhost:<port+1>` and `127.0.0.1:<port+1>`.

- **MEDIUM-3** `src/server/repo.mjs:40` — **B9's git allow-list guard is never exercised.** Disabling it (P1) survives. `readIntentMetadataFromBranch` (`scripts/session-io.mjs:54`) also runs git outside this guard (by reading: `for-each-ref`, `ls-tree`, `show` only). Needs rework: export the guard (or a thin `gitRead`) and test that `checkout` is rejected without running; name the session-io exception in the comment at `repo.mjs:1-4`.

- **MEDIUM-4** `src/server/repo.mjs:15,79` — **B6's 30 s timeout is unproven.** Dropping the timeout (P8) or making it 300 s (P8b) survives; AC4 covers only exit 1 and non-JSON. Needs rework: make the timeout a parameter (default `QUEUE_TIMEOUT_MS`), add a fixture whose `queue.mjs` never exits, and with a timeout around 500 ms assert a 502 whose message contains "timed out".

- **MEDIUM-5** `src/core/docref.mjs:19` (test `src/core/docref.test.mjs:22`) — **"matches the id prefix exactly, not 10- for 1" does not prove it.** With the `-` dropped from the prefix (D3), `.sort()` still picks `1-first`. Needs rework: add `chooseFolder(1, ['10-other', '11-x']) === null`.

- **MEDIUM-6** `scripts/intent-check-lib.mjs:153` — **The narrowed `CORE_CODE` is unproven, and this file is Reviewed-tier enforcement.** Reverting to `/^src\//` passes all 374 kit tests (K1); the one changed kit test uses `src/core/x18.txt`, which matches both. Needs rework: in `scripts/intent-check-lib.test.mjs`, assert that an untested change to `src/server/x.mjs` or `src/web/x.mjs` does not route as core code and one to `src/core/x.mjs` does.

- **MEDIUM-7** `src/architecture.test.mjs:44-48`, `eslint.config.mjs:7-9` — **Principle 1 says *Enforced*, but only part of it is.** In a scratch clone, `import fs from 'fs'` plus `process.env.HOME` in `src/core/hash.mjs` passed both the architecture test and lint: bare built-in specifiers are skipped (`if (!spec.startsWith('.')) continue`), and `src/core` gets `globals.node` (line 7), contrary to the comment at lines 8-9. Needs rework: treat bare built-ins as `node:` imports (`builtinModules` from `node:module`) with a planted case, and give `src/core/**` ES globals only, or correct principle 1 in `docs/architecture.md` to what is enforced.

- **MEDIUM-8** `src/web/app.mjs:192` — **B20's fallback logic sits in the page, untested.** "An unknown or missing doc falls back to the first existing one" lives in `src/web` (principles 3 and 9), and AC9 covers only parsing. Needs rework: move it into `src/core/hash.mjs` (e.g. `pickDoc(documents, wanted)`) and test a wanted doc that exists, one missing, null, and an intent with no documents.

- **MEDIUM-9** `README.md:7-19` — **README.md is stale.** It still says "So far the repository holds only the process kit … decided by §1" and "The kit needs Node ≥ 22 and nothing else", and doesn't mention `npm start -- <repo>`, port 5300 or `npm run setup:worktree`. Needs rework: describe the product, how to start it, and that it needs `npm ci`.

- **LOW-1** `intents/README.md:58-59`, `scripts/spawn-intent.mjs:8` — **Two more stale passages:** "language-neutral until §1 picks the stack and narrows `CORE_CODE`" and "§1 picks the stack, so the kit defines none". Needs rework: update both.

- **LOW-2** `docs/architecture.md:84` — **The exceptions table still says "(none yet)"** although principle 2 records the `repo.mjs` → `scripts/session-io.mjs` exception inline. Needs rework: add the row (exception, principle 2, reason).

- **LOW-3** `REVIEW-POLICY.md:30,45-46` — **Policy edits beyond the plan.** Besides rule 1 and the "by meaning" clause, the diff names `eslint.config.mjs` in the lint guardrails and rewrites the Attested prerequisite (the old sentence became false). Both look reasonable; read them as part of the Reviewed-tier diff read.

- **LOW-4** — **Remaining survivors are equivalent or low-value; no rework required.** D4 `docref.mjs:20` (no test with two same-prefix folders); L2 `layout.mjs:29` (truncate boundary); L16 `:110` (self-arrow guard); L21b `:118`, L21c `:117` (padding, minimum rows); R1 `render.mjs:8` (`<style>` still dropped without `FORCE_BODY`); R3 `:7` (`USE_PROFILES`); R4b `:8` (DOMPurify forbids iframe/object/embed by default); P3 `repo.mjs:41` (`GIT_OPTIONAL_LOCKS` unobservable); P9 `:79` (`process.execPath` vs `node`, same node here); P15 `:111`, P16b `:130` (branch-conflict path never calls `branchOf`); T1 `static.mjs:37` and T2 `:40` (each traversal layer alone; both removed is killed); T7 `:38` (no other extensions exist).

### Mutants (103 run by the reviewer)

Back up by copy, apply one change, run the suite, restore by copy, check
`git diff --quiet`. `src/` and `bin/` mutants ran against
`node --test "src/**/*.test.mjs"` (the kit tests import no product module);
kit mutants against `node --test "scripts/*.test.mjs"`.

**Killed (77):** `hash.mjs` H1–H6; `docref.mjs` D1, D2, D5; `layout.mjs`
L1, L3–L15, L17, L19, L20, L21a, L22–L28, L30; `render.mjs` R2, R4, R5–R9;
`server.mjs` S1, S2, S3a, S4, S6, S8–S16; `repo.mjs` P2, P4–P7, P10–P14,
P16, P18, P19; `static.mjs` T1+T2 together, T3–T6; `bin/intent-map.mjs` B1;
`size-budget-lib.mjs` K2.

**Survived (26):** D3, D4; L2, L16, L21b, L21c, L29a, L29b, L29c; R1, R3,
R4b; S3b, S5a, S5b; P1, P3, P8, P8b, P9, P15, P16b; T1, T2, T7; K1.

**Expected killed after rework:** L29a–c (HIGH-2); S5a, S5b (MEDIUM-1);
S3b, S3c (MEDIUM-2); P1 (MEDIUM-3); P8, P8b (MEDIUM-4); D3 (MEDIUM-5); K1
(MEDIUM-6); the core-purity probe (MEDIUM-7).

## Not checked

- **The page itself.** `src/web/app.mjs` and `style.css` have no automated test: B10, B12 colours, B13 hover and focus, B17, B19, B21 keyboard tabs, B22 dark mode and offline. Not rendered in a browser this round; the live check covers them.
- **Timing on an idle machine.** The timings were taken under about 50 % CPU load.
- **Héraklios's board as Progress recorded it.** Héraklios has moved: today `main` is 063908b, with 5 shipped, 4 build, 5 planned and 2 draft, arrows §83→§82 and §73→§84; its queue holds 63 intents, not "~90".
- **Lint in the mutation loop.** Survivors are test survivors only.
- **Mutant S3c** (Host check ignoring the port): judged by reading, not run.
- **The target repo's `queue.mjs`** was not audited (spec I2 accepts that).
- **Platforms:** Windows only.
- **AC13** ran from the npm cache (`npm ci --offline`), not the registry.
- **Coordinator re-check incomplete:** T2, T7 and K1 were not re-run by the coordinator (see below).

## Live check

- **Owed:** rule 1 (`bin/**`, `src/server/**`, `src/web/**` are new), plus the page behaviour under Not checked. Run it after the rework round. Until HIGH-1 is decided, expect an intent to take about 3–4 s to open on Héraklios.
- **Steps:**
  1. In `C:/Users/eric/src/sdlc-intent-map-wt/1-local-intent-map`, run `npm start -- C:/Users/eric/src/heraklios` and open `http://localhost:5300/`.
  2. Compare the board with `npm run queue` in Héraklios: open intents in Build · review, Planned · waiting or Drafts, at most 5 shipped, red arrows for the direct open blockers (today §83→§82 and §73→§84). Hovering or tabbing to an arrow shows "§<target> waits for §<source>: <reason>".
  3. Open the reader by clicking a counter, by Enter on a shipped row, and from the picker. Check the title, the meta line (type · status · gates · auto · read from <ref>) and the blockers list; missing-document tabs are disabled; tabs switch by click and by Left/Right.
  4. Load directly: `#i-73-plan` opens §73's plan from `refactor/73-boardscene-on-session`; `#i-81-bogus` falls back to §81's first document; `#i-999` shows "No intent §999 in this repo".
  5. Switch Windows to dark mode and reload: the page follows.
  6. In Héraklios, commit a change to one intent's `metadata.yml` on a scratch branch you own, reload, and see it.
  7. Wi-Fi off, reload: no missing styles or scripts; DevTools → Network shows only `localhost`.
  8. Ctrl+C, then `npm start` in this worktree: §1 shows and its documents open.
- **You should see:** the board matches `npm run queue`, documents render as formatted Markdown, nothing loads from another host, and Héraklios's `git status` is unchanged apart from your own commit.

## Verified myself vs. taken on trust

Verified myself (reviewer):
- Branch state: worktree on `feat/1-local-intent-map` at 936272b; `main` (16a3eac) is an ancestor; no remote; `status: in-review` set.
- `npm run verify` exit 0 (lint clean, 374 and 82 pass); `npm run check:intent` PASS; `npm run size:baseline` prints `{}`, matching the committed file; `npm run sdlc:scan -- --sample-due auto --exclude 1` gives `sampled: no`.
- AC13: fresh clone of the branch, `npm run setup:worktree -- --offline` exit 0, `npm run verify` exit 0.
- 103 mutants as listed; the core-purity probe and `eslint --print-config` in a scratch clone.
- Read-only timing run against Héraklios on port 5399; its `git status` and refs identical before and after.
- Lockfile sources and a secrets scan of the diff.

**Coordinator, re-run** (in the worktree at 936272b):
- `npm run verify`: exit 0; `test:kit` 374 pass, 0 fail; `test:app` 82 pass, 0 fail. Matches.
- `npm run check:intent`: `type-check: PASS (intent 1, feature)`, note "30 file(s), 3471 line(s) changed outside intents/". Matches.
- Surviving mutants, each run against its suite with backup and restore by copy: D3, D4, L2, L16, L21b, L21c, L29a, L29b, L29c, R1, R3, R4b, S3b, S5a, S5b, P1, P3, P8, P8b, P9, P15, P16b, T1 all **survived**. Matches the reviewer for all 23.
- **Not re-run:** T2, T7, K1. The re-check was stopped by the system for low memory while T2 was applied. `src/server/static.mjs` was restored from its backup copy, the backup removed, and `git status --short` was clean afterwards. These three rest on the reviewer's run only.

Taken on trust:
- The implementer's headless-Edge observations.
- The 371 → 374 kit-test delta (consistent with the size-budget test diff; `main`'s suite not run).
- Héraklios's board as it stood when Progress was written.
