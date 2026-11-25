<!-- generated-by: sdlc-intent-map/review@0.3.0 -->
# §1 review — Stack, skeleton and a first intent map served on localhost from a repo

verdict: escalate
tier: reviewed
reviewed-commit: adaf68eb7ca9ca6ad8d4f1b9c6db176fb8a5e914
round: 2
sampled: no
run: auto
live-check: owed

Tier: **Reviewed**, set by the path table: the diff touches `REVIEW-POLICY.md`,
`scripts/intent-check-lib.mjs` and `eslint.config.mjs` (lint guardrails).
`metadata.yml` does not raise it. No finding needs rework or a decision, so
the verdict is `escalate`: the owner reads the diff.

The reviewer's pass 4 was cut short when the system stopped its mutation
batch for low memory. The coordinator then ran the remaining mutants with
the reviewer's own harness, one at a time (see "Mutants"). The verdict
rests on that completed run.

## Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | pass: rework commits cd9a4bc, 8b32a17, 736227a, 413f427 address only round-1 findings; `pickDoc` sits in `src/core/hash.mjs`, which "Where this goes" gives B20; the spec amendment c58b775 is the owner's choice (c) |
| 2 | Type check | pass: FAIL whose only error is the owed live check (the owner's to clear) |
| 3 | Behaviour against the spec | pass: Performance line amended; B20 fallback is `pickDoc`, tested; B6 timeout and B9 allow-list tested |
| 4 | Tests prove the behaviour | pass, with notes: 38 mutants; every round-1 target is killed; 10 survivors, all equivalent or low-value (LOW-1 to LOW-4) |
| 5 | Conventions | pass: temp fixture repos, port 0, no live external calls, git with argument arrays |
| 6 | Numbers in prose | pass: 376 kit and 95 product tests reproduce; the spec's "~60 intents" matches round 1's 63 |
| 7 | Documentation | pass: README.md describes the product, `npm start -- <repo>`, port 5300, `npm ci` and `setup:worktree`; `intents/README.md` and `spawn-intent.mjs` updated (LOW-5 for the generated grid) |
| 8 | Guardrails and hygiene | pass: lint clean, no cap raised, no new dependency, no secrets |
| 9 | Repository footguns | pass (the list is empty) |
| 10 | Architecture | pass, with a note: principle 1 names both enforcement means; the exceptions table has the `session-io` row (principle 12); `pickDoc` moved B20 logic into the core (principles 3, 9). LOW-3 is how far lint's half of principle 1 is proven |

## Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: FAIL (intent 1, feature)
  error: A live check is owed and not recorded. Do the steps in intents/1-local-intent-map/review.md → ## Live check, then set live_checked: <date> in intents/1-local-intent-map/metadata.yml.
  note:  33 file(s), 3638 line(s) changed outside intents/.
```

No other error. `npm run verify` at adaf68e: exit 0; lint clean; `test:kit`
376 pass, 0 fail; `test:app` 95 pass, 0 fail.

## Round-1 findings: resolution

- **HIGH-1** resolved by decision: spec Performance line amended in c58b775 (owner's option (c)); code unchanged, as (c) intends.
- **HIGH-2** resolved: `src/core/layout.test.mjs:104-106,126-129`; L29a, L29b, L29c, L29c2 killed.
- **MEDIUM-1** resolved: `api.test.mjs:211-220`; S5a, S5b killed by "answers 404, not 502, for a non-numeric id even when queue.mjs fails".
- **MEDIUM-2** resolved: S3b and S3c (Host check ignoring the port) killed by "matches the Host exactly…".
- **MEDIUM-3** resolved: P1 and G1 killed by the allow-list tests; the `repo.mjs` header names the session-io exception. G2 survives (LOW-4).
- **MEDIUM-4** resolved: `api.test.mjs:222-246`; P8 killed by "answers 502 "timed out" when queue.mjs never exits…", P8b by "defaults to 30 s". TP7 survives (LOW-1).
- **MEDIUM-5** resolved: D3 killed by "is null when only longer ids share the digits".
- **MEDIUM-6** resolved: K1 killed by "an untested change to src/server or src/web does not…".
- **MEDIUM-7** resolved: CP1 (`import fs from 'fs'`) and CP3 (`fs/promises`) killed by the architecture test; CP2 (`process.env`) killed by lint (`'process' is not defined  no-undef`); AB1 killed by "fires on planted bad imports".
- **MEDIUM-8** resolved: `pickDoc` at `src/core/hash.mjs:30-34`, used at `app.mjs:192`; PD1, PD3, PD4 killed; PDW killed by lint.
- **MEDIUM-9, LOW-1, LOW-2** resolved: README.md:7-33; `intents/README.md:58-59`; `spawn-intent.mjs:8`; `docs/architecture.md:86`.
- **LOW-3, LOW-4** (round 1): no change, as intended. Round 1's LOW-3 (policy edits beyond the plan) remains part of the diff read.

## Findings

- **LOW-1** `src/server/repo.mjs:79` — the 30 s default is proven on the constant, not on its use: TP7 (`{ timeoutMs = 300_000 } = {}`) survives, because "defaults to 30 s" asserts only `QUEUE_TIMEOUT_MS`. Worth a look: assert the default flows into `readQueue`, e.g. through the "timed out after 30 s" message wording.
- **LOW-2** `src/server/server.mjs:48` — TP2 (`/api/intent` calls `readQueue(ctx.root)` without `ctx`) survives: only `/api/queue` is exercised with a short timeout, so `/api/intent` keeps 30 s either way. Worth a look.
- **LOW-3** `eslint.config.mjs:11,15` — E1 (core given `globals.node`) and E2 (node block without its `ignores`) survive `npm run verify`, because no test lints a planted core file. CP2 shows the config works today, but only the Reviewed tier on eslint config changes guards it. Worth a look: lint a planted file with `ESLint.lintText(..., { filePath: 'src/core/probe.mjs' })` in `src/architecture.test.mjs`.
- **LOW-4** `src/server/repo.mjs:43` — G2 (`READ_ONLY_GIT.some((c) => args.includes(c))`, an allow-list that matches any argument) survives: the tests pass a forbidden subcommand alone (`checkout`, `commit`, `config`), never alongside an allowed word. Real callers always pass the subcommand first, so this is a gap in proof, not a defect. Worth a look: also assert `gitRead(root, 'checkout', 'show')` rejects.
- **LOW-5** `docs/sdlc-grid.md:31` still says "stack-agnostic until §1 (undecided)". The file is generated by `/grid`: refresh it after the merge. (`OVERVIEW.md:19` is the owner's.)

No finding needs rework or a decision.

## Mutants (round 2)

Harness (the reviewer's, run by the coordinator from the scratchpad):
back up by copy, string replace (exactly one match), check `git diff
--quiet` is non-zero, run the suite (`node --test "src/**/*.test.mjs"`, plus
eslint for `app+lint` mutants; `scripts/*.test.mjs` for K1), restore by copy,
check `git diff --quiet` is zero. No orphan `queue.mjs` process was left or
killed. `git status --short` was empty at the end.

**Killed (28):**

| Mutant | Line | Killed by |
| --- | --- | --- |
| L29a | `layout.mjs:146` | "draws an arrow for a direct open blocker, source to target, with the reason" |
| L29b, L29c2 | `layout.mjs:147` | "same column: bottom of the upper to top of the lower, and the reverse" |
| L29c | `layout.mjs:146` | "draws an arrow for a direct open blocker…" |
| S5a, S5b | `server.mjs:47` | "answers 404, not 502, for a non-numeric id even when queue.mjs fails" |
| S3b, S3c | `server.mjs:65` | "matches the Host exactly: another name that starts with localhost, or another port, is refused" |
| P1 | `repo.mjs:43` | "rejects any other subcommand without running it" |
| G1 (`checkout` added to the list) | `repo.mjs:23` | "lists only read-only subcommands" |
| P8 | `repo.mjs:82` | "answers 502 "timed out" when queue.mjs never exits, and leaves no process behind" (suite timed out) |
| P8b | `repo.mjs:18` | "defaults to 30 s" |
| TP1, TP3, TP4 | `server.mjs:43,60,86` | "answers 502 "timed out" when queue.mjs never exits…" |
| TP5, TP6 | `repo.mjs:84` | the same test |
| D3 | `docref.mjs:19` | "is null when only longer ids share the digits" |
| K1 | `intent-check-lib.mjs:153` | "an untested change to src/server or src/web does not…" |
| CP1, CP3 | `hash.mjs:2` (planted import) | "the real tree has no violations" (architecture) |
| CP2 | `hash.mjs:2` (planted `process.env`) | lint: `'process' is not defined  no-undef` |
| PD1 | `hash.mjs:32` | "falls back to the first existing one when the wanted one is missing" |
| PD3 | `hash.mjs:33` | "falls back past a missing first document" |
| PD4 | `hash.mjs:31` | "is null for an intent with no documents" |
| PDW | `app.mjs:192` | lint: `'doc' is defined but never used` |
| AB1 | `architecture.test.mjs:16` | "fires on planted bad imports" |
| E3 | `eslint.config.mjs:19` | lint: `'structuredClone' is not defined` |

**Survived (10), none needing rework:**

| Mutant | Line | Why |
| --- | --- | --- |
| PD2 (drop `DOCS.includes`) | `hash.mjs:32` | equivalent: `has()` is false for any name not in `documents` |
| PD5 (`documents[d]`) | `hash.mjs:31` | unreachable: callers always pass an object |
| PD6 (drop `wanted &&`) | `hash.mjs:32` | equivalent: `DOCS.includes(null)` is false |
| G2 | `repo.mjs:43` | LOW-4 |
| TP2 | `server.mjs:48` | LOW-2 |
| TP7 | `repo.mjs:79` | LOW-1 |
| AB2, AB3 | `architecture.test.mjs:16` | equivalent: `builtinModules` lists `fs/promises`, and the `node:` clause catches the rest |
| E1, E2 | `eslint.config.mjs:15,11` | LOW-3 |

## Not checked

- **The page itself** (`src/web/app.mjs`, `style.css`): no automated test, not rendered this round. The live check covers it.
- **Héraklios timings** against the amended Performance line: not re-measured (to save memory). The live check's step 2 measures them.
- **Platforms:** Windows only.
- **Independence of pass 4:** the reviewer designed the mutants and predicted the survivors; the coordinator ran 33 of the 38. Every predicted survivor survived and every claimed kill was killed, with no mismatch. A second independent run was not done.

## Live check

- **Owed:** rule 1 (`bin/**`, `src/server/**`, `src/web/**` are in the diff), plus the page behaviour under Not checked.
- **Steps:**
  1. In `C:/Users/eric/src/sdlc-intent-map-wt/1-local-intent-map`, run `npm start -- C:/Users/eric/src/heraklios` and open `http://localhost:5300/`.
  2. In Héraklios, time `node scripts/queue.mjs --json` once (`Measure-Command { node scripts/queue.mjs --json }`); call it Q.
  3. Compare the board with `npm run queue` in Héraklios: open intents in Build · review, Planned · waiting or Drafts, at most 5 shipped, red arrows for the direct open blockers. Hovering or tabbing to an arrow shows "§<target> waits for §<source>: <reason>".
  4. Open the reader three ways (click a counter, Enter on a shipped row, the picker). Each open takes about Q + 0.5 s or less (the amended line). Check the title, the meta line, the blockers list, disabled tabs for missing documents, and tab switching by click and by Left/Right.
  5. Load directly: `#i-<an in-flight id>-plan` opens that plan from its branch; `#i-<id>-bogus` falls back to the first existing document; `#i-999` shows "No intent §999 in this repo". A load that opens from the hash may take up to about 2 × Q.
  6. Switch Windows to dark mode and reload: the page follows.
  7. In Héraklios, commit a change to one intent's `metadata.yml` on a scratch branch you own, reload, and see it.
  8. Wi-Fi off, reload: nothing missing; DevTools → Network shows only `localhost`.
  9. Ctrl+C, then `npm start` in this worktree: §1 shows and its documents open.
- **You should see:** the board matches `npm run queue`, documents render as formatted Markdown, nothing loads from another host, opening an intent takes about Q or less, and Héraklios's `git status` is unchanged apart from your own commit.

## Verified myself vs. taken on trust

Verified myself (reviewer, worktree at adaf68e):
- `npm run verify` exit 0 (lint clean, 376 and 95 pass); `npm run check:intent` FAIL with the live-check error only; `npm run sdlc:scan -- --sample-due auto --exclude 1` → "nth attested auto change = 1, every 3, sampled: no".
- `main` still 16a3eac; no remote, so nothing merged or pushed.
- The full diff 936272b..adaf68e read.
- Mutants L29b, L29c, L29c2, S3b, P1 killed (before the low-memory stop); the interrupted P8 restored by copy, `git status --short` empty.

**Coordinator, re-run** (worktree, after f8d0cf5; product code unchanged since adaf68e):
- `npm run verify`: exit 0; lint clean; `test:kit` 376 pass, 0 fail; `test:app` 95 pass, 0 fail. Matches.
- `npm run check:intent`: FAIL with only "A live check is owed and not recorded…", note "33 file(s), 3638 line(s) changed outside intents/". Matches.
- `npm run sdlc:scan -- --sample-due auto --exclude 1`: `sampled: no`. Matches.
- All 38 mutants above, with the reviewer's harness, one at a time: every kill the implementer's round-1 rework claimed (L29a–c, S5a, S5b, S3b, S3c, P1, P8, P8b, D3, K1, AB1, the core-purity probes) is killed by the test it named. Every survivor the reviewer predicted (PD2, PD5, TP2, TP7, AB2, AB3, E1, E2) survives. PD6 and G2 were not predicted either way: PD6 is equivalent, G2 is LOW-4. No mismatch. `git status --short` empty at the end; no process killed.

Taken on trust:
- The implementer's statement that it stopped the hung processes its own P8 run left behind.

## KonMari check

KonMari ran from base 045fe72: `outcome: kept`, one tidy-up commit
(bb96c11 `§1 konmari: one titleOf rule for an intent's display name`, in
`src/core/layout.mjs` and `src/web/app.mjs`) and the record commit 4786ace
(`konmari.md` only). A second fold (`QUEUE_GROUPS` into the core) was not
committed, because its verify run was stopped for low memory and the files
were restored. It is recorded under "Looked at and left" and as a proposed
refactor intent.

**Coordinator, re-run** (worktree at 4786ace, one command at a time):
- `npm run verify`: exit 0; lint clean (no warnings, as before); `test:kit` 376 pass, 0 fail; `test:app` 95 pass, 0 fail. The test count did not fall, and the warning count did not rise.
- `npm run check:intent`: FAIL with only "A live check is owed and not recorded…", note "33 file(s), 3643 line(s) changed outside intents/".
- Killed mutants on the files the tidy-up changed, re-applied at their moved lines with the same harness:
  - L29a (`layout.mjs:151`) and L29c (`:151`): killed by "draws an arrow for a direct open blocker, source to target, with the reason".
  - L29b (`:152`) and L29c2 (`:152`): killed by "same column: bottom of the upper to top of the lower, and the reverse".
  - PDW (`app.mjs:192`): killed by lint (`'doc' is defined but never used`).

  `git status --short` was empty afterwards.
- Size baseline: still `{}`, since no budgeted file is over 500 lines. No ceiling moved.

**Reviewer's read of 045fe72..4786ace** (`sdlc-intent-map-reviewer`, read only):
- Reach: pass. It replaces the intent's own five copies of `title ?? slug ?? ''`, at `layout.mjs` 51, 79, 80, 124 and the reader title in `app.mjs`, and nothing else.
- Behaviour: pass, no change. `titleOf(i)` is exactly `i.title ?? i.slug ?? ''` at every site.
- Tests, dependencies, suppressions: pass. No test file, `package.json` or lockfile changed, and no lint suppression was added.
- Principles: pass on 1, 2, 3, 4, 5, 6 and 9.
- `konmari.md` matches the commits: `outcome: kept` stands alone on its line, `## Tidied` lists bb96c11, and what was left and the two proposed refactor intents are recorded.

No finding.
