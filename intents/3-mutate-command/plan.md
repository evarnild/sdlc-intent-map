<!-- generated-by: sdlc-intent-map/build-plan@0.3.0 -->
# §3 plan — A kit command that runs a review's mutants one at a time and restores every file

Intent: [intent.md](intent.md) · Spec: [spec.md](spec.md)

Approved before any code exists. If the plan turns out wrong mid-execution,
stop, fix the plan, and re-approve — don't push through.

## Goal

Add `npm run mutate`: a Node-only kit command that reads a JSON list of
mutants, applies each to a clean work tree one at a time, runs the target's
own npm suite, prints one result line per mutant, and always puts the file
back, even after a stop from outside. Then make the review flow call it
instead of describing a hand-made harness (spec B1–B19, AC1–AC12).

## Risks

- **Pass 9 lists no repository footguns yet** (`REVIEW-POLICY.md`, "This list
  starts empty"), so these are this change's own.
- **Restoring is the whole point and the easiest thing to get wrong.** A
  stopped run that leaves a file mutated is exactly what §1 hit twice. The
  state file and the saved bytes must be written *before* the file is changed,
  and the recovery test must kill a real child run, not simulate it only.
- **Line endings on Windows.** The owner's files are CRLF on disk. Matching on
  `\n` and writing back in the file's own style (B6, B7) is easy to get
  half right: a `to` that contains `\n` must become `\r\n` in a CRLF file, and
  a mixed-ending file must not be rewritten wholesale. Test both fixtures.
- **Killing a process tree on Windows.** The suite runs as `npm run …` through
  a shell, so the child's pid is the shell's. `taskkill /PID <pid> /T /F` ends
  the tree it started; the test must prove a *sibling* process the test itself
  started is untouched (I4). The POSIX branch (`detached` + `process.kill(-pid)`)
  is written but cannot be run here.
- **A shell sees a command string.** Spawning `npm run test:app` needs a shell
  on Windows (Node refuses to spawn a `.cmd` without one). B8 says no shell
  sees `from` or `to`: the string must come only from the fixed suite table,
  never from the list. A test with shell metacharacters in `from`/`to`/`name`
  proves it.
- **Tests that pass whatever the code does.** Every result state needs a
  fixture whose suite really fails or passes because of the mutation; restore
  checks compare *bytes* with the committed file, not only `git status`.
- **The kit suite gets slower.** `mutate.test.mjs` runs real `node --test`
  children. Keep each fixture suite to one or two tiny tests, and keep the
  whole file under about 15 s, so `npm run verify` does not grow noticeably
  (it already ran into the machine's memory limit in §1).
- **`GIT_TRACE2_EVENT` instead of a PATH wrapper (AC6).** The spec's AC6 says
  the test "puts a `git` wrapper first on `PATH`". On Windows `child_process`
  does not resolve a `git.cmd` wrapper (only `.exe`), so the plan records every
  git invocation with `GIT_TRACE2_EVENT=<file>` instead, which logs each
  command's `cmd_name`. Same observable, works here; see Assumptions.
- **Stale line citations.** Line numbers below were read at the commit named
  below; re-check before launch if `main` moves.

## Verified against the codebase

Re-read on `main` at `13b6583`.

- `package.json:10-24` — the scripts block: `lint` (`:12`), `test:kit`
  (`:13`), `test:app` (`:14`), `verify` (`:22`: `npm run lint && npm run
  test:kit && npm run test:app`), `setup:worktree` (`:23`). No `mutate` yet.
  `test:kit` is `node --test "scripts/*.test.mjs"`, so a new
  `scripts/mutate.test.mjs` runs in `verify`.
- `scripts/size-budget.mjs:1-30` and `scripts/size-budget-lib.mjs` — the kit's
  pattern: a thin I/O script with a pure `-lib.mjs`, tests beside them,
  `process.argv.slice(2)` parsing with a one-line error and `process.exit(1)`
  on an unknown argument.
- `scripts/size-budget-lib.mjs:30` (`BUDGETED`) — the budget covers
  `scripts/**/*.mjs`; `scripts/size-baseline.json` is `{}`; no file is near
  500 lines (largest `scripts/deliver.test.mjs`, 717 lines, is a test).
- `scripts/expect.mjs:1-12` — the kit's `expect` and `each` helpers on
  `node:assert`; every kit test imports `{ describe, it } from 'node:test'`
  and `{ expect } from './expect.mjs'`.
- `scripts/session-io.mjs:12-14` — `git(cwd, ...args)` via `execFileSync`; the
  kit's one git helper. The new command needs `status --porcelain` and
  `rev-parse --git-dir`/`--is-inside-work-tree` only, and keeps its own
  allow-list (B18), so it does not import this one.
- `REVIEW-POLICY.md:164-168` — pass 4's text (quoted in the spec).
- `.claude/skills/review/SKILL.md:69-73` — "Pass 4 (mutations) is the
  expensive one …": the three bullets B19 replaces.
- `.claude/agents/sdlc-intent-map-reviewer.md:64-71` — "Enumerate mutations
  from `git diff` …", "Guard your own harness: assert that the file actually
  changed (`git diff --quiet` returns non-zero) …"; `:19-45` the read-only and
  restore-by-copy rules (these stay: they still cover the reviewer's own
  probes); `.codex/agents/sdlc-intent-map-reviewer.toml:15` — "Mutation-test
  the changed behavioural lines: revert each, run the full suite, …".
- `.claude/skills/auto/SKILL.md:236-246` — step 6: "every mutant the review
  lists as surviving", "For a mutant: back up the target file by copy, …".
- `.claude/skills/konmari/SKILL.md:56-59` — step 3, item 3: "every mutant the
  latest `review.md` records as **killed** … re-apply it … restore by copy".
- `CLAUDE.md:21-34` — the Commands block (alphabetical by nothing; `size:baseline`
  is `:25`, `spawn` `:28`), where one `npm run mutate` line goes.
- `src/core/hash.mjs:1-34` — the file AC12's list mutates: `parseHash` (regex
  `HASH_RE`, `Number(m[1])`, `m[2] && DOCS.includes(m[2]) ? m[2] : null`),
  `buildHash` (`DOCS.includes(doc) ?`), `pickDoc` (`DOCS.includes(wanted) &&
  has(wanted)`, `DOCS.find(has) ?? null`). Tests: `src/core/hash.test.mjs`.
- Node on this machine: v22.18.0 (`os.freemem()`, `fs`, `child_process`,
  `node:test` as used elsewhere in the kit).

## Where this goes

- **Modules touched:** `package.json` (one script), `REVIEW-POLICY.md` (one
  sentence in pass 4), `.claude/skills/review/SKILL.md`,
  `.claude/agents/sdlc-intent-map-reviewer.md`,
  `.codex/agents/sdlc-intent-map-reviewer.toml`,
  `.claude/skills/auto/SKILL.md`, `.claude/skills/konmari/SKILL.md`,
  `CLAUDE.md` (one Commands line).
- **New modules:**
  - `scripts/mutate-lib.mjs` — pure: validates a list (B2, B3), finds and
    applies one mutant on text with line endings read as `\n` (B6–B8), gives
    the line of a match, parses failing test names and the first lint error
    out of suite output (B12), and formats result and summary lines (B17).
  - `scripts/mutate.mjs` — the I/O: parses arguments (B1), checks the work
    tree (B4, B5), recovers a stopped run, runs the loop, starts the suite
    child and ends its tree on timeout (B9, B11), checks free memory (B16),
    writes the state, backup and results files (B13–B15), and sets the exit
    code. The only place that touches `fs`, `child_process`, `os` or git.
  - `scripts/mutate-lib.test.mjs`, `scripts/mutate.test.mjs` — the tests.
  - `intents/3-mutate-command/mutants.json` — the five-mutant list AC12 runs
    over `src/core/hash.mjs`.
- **Why there:** `scripts/` is the kit's home and both the reviewer and the
  coordinator run commands from any worktree (principles 3, 9: logic in pure
  functions with tests, I/O thin; principle 4: the suite table is the only
  definition of what `app`, `kit`, `lint` and `verify` mean, and it points at
  `package.json`). It does not touch `src/`, so `CORE_CODE`
  (`src/core/`) and the product's layering rules do not apply. No new layer
  or exception, so `docs/architecture.md` is unchanged.
- **Budget lines:** none (every new file is expected to stay far below 500
  lines; `mutate.mjs` about 250, `mutate-lib.mjs` about 150).

## Subtasks

Each ends with `npm run verify` green and a commit. Run one heavy command at
a time: `verify` and the new tests spawn real `node --test` children, and the
machine ran short of memory twice during §1.

1. **The pure half.** `scripts/mutate-lib.mjs` and
   `scripts/mutate-lib.test.mjs`: `validateList` (B2, B3 → AC1), `findMatches`
   and `applyMutant` on text with `\r\n` read as `\n` and written back in the
   file's own style (B6, B7, I6 → AC3, AC4), `lineOf`, `failureNames` (B12),
   `formatResult`, `summary` (B17 → AC10), `SUITES` table (B3, I1).
   Code comments for I1, I3, I6 at their sites.
2. **The loop.** `scripts/mutate.mjs` (arguments B1, clean-tree and work-tree
   checks B4/B5, apply, run, restore with byte comparison B7/B9/B10, results
   lines B14, exit codes B17, git allow-list B18) and the first tests in
   `scripts/mutate.test.mjs` with the temp-repo fixture (AC1 refusals, AC2,
   AC5, AC6, AC10). Comment for I2.
3. **The safety nets.** Timeout and tree kill (B11, I4, I5), state file and
   recovery (B13), `--resume` (B15), memory guard (B16) in `mutate.mjs`, with
   their tests (AC7, AC8, AC9). The recovery test starts a real run in a child
   process, kills it while the suite is running, and runs the command again.
4. **Wiring and docs.** `"mutate": "node scripts/mutate.mjs"` in
   `package.json`; `intents/3-mutate-command/mutants.json`; the B19 edits to
   the six files; one `npm run mutate` line in `CLAUDE.md`; the AC11 test;
   `status: in-review` in `metadata.yml`. Run the command on its own list once
   and put what it printed in `## Progress` (evidence, not the live check).

## Tests

| Behaviour | Test | Would fail if |
| --- | --- | --- |
| B1 arguments, defaults, unknown option, missing list | `mutate.test.mjs` (exit 2, one-line message) | an option is accepted silently or a default changes |
| B2 list rules (duplicate name, absolute and `..` path, empty `from`, unknown suite) | `mutate-lib.test.mjs` per rule, plus `mutate.test.mjs` that nothing is touched | a rule is dropped |
| B3 suite table and `+` order, stop at first failure | `mutate-lib.test.mjs` (table), `mutate.test.mjs` (`lint+app` runs both; a failing `lint` skips `app`) | the table or the order changes |
| B4 dirty tree, B5 not a work tree | `mutate.test.mjs`: exit 2 and the file bytes unchanged | a refusal is dropped |
| B6 0 and 2 matches are NOT APPLIED; B8 regex characters are text | `mutate-lib.test.mjs` (`.*`, `\d`, `$`, `(`), `mutate.test.mjs` (file unchanged) | matching becomes a regex, or counts matches wrongly |
| B6/B7/I6 LF and CRLF, `to` with `\n` in a CRLF file, mixed endings, `from` == `to` | `mutate-lib.test.mjs` and `mutate.test.mjs` byte compare of the whole file | a line ending is normalised or a file rewritten wholesale |
| B7 changed-bytes guard | a `from`==`to` case is NOT APPLIED (`no change`), restored | the guard is removed |
| B9 one at a time, B10 byte-compared restore | `mutate.test.mjs`: the suite records timestamp and the file's bytes at start; second mutant starts after the first's restore | two mutants overlap, or a restore is not checked |
| B10 `RESTORE FAILED` exit 4 | a suite that rewrites the target file | the compare is removed |
| B11 timeout, tree kill, sibling untouched | `mutate.test.mjs`: `sleep` suite with `--timeout 1`, checks pids of child and grandchild are gone, a sibling the test started is alive | the tree is not ended, or another process is |
| B12 KILLED/SURVIVED/NOT APPLIED/TIMEOUT, failing names, lint line | `mutate-lib.test.mjs` (`failureNames` on real `node --test` output) and `mutate.test.mjs` | a state is mislabelled, a TIMEOUT counted as killed |
| B13 state file and recovery | `mutate.test.mjs`: kill a real run mid-suite, assert the file is mutated, run again, assert `recovered …`, bytes equal the commit | the state is written after the change, or recovery is skipped |
| B14 results line per mutant as it ends | `mutate.test.mjs`: kill a run after the first mutant, the first line is on disk | lines are buffered to the end |
| B15 `--resume` skips and does not repeat | `mutate.test.mjs` | resume re-runs or duplicates |
| B16 memory floor, exit 3, nothing applied | `mutate.test.mjs` with `--min-free-mb 99999999` (nothing applied, exit 3, message names the next mutant) and `--min-free-mb 0` proceeds | the guard is removed or runs after the apply |
| B17 line and summary format, exit codes 0/2/3/4 | `mutate-lib.test.mjs` (`formatResult`, `summary`), `mutate.test.mjs` | the format changes |
| B18 only `status` and `rev-parse`; nothing else written | `mutate.test.mjs`: `GIT_TRACE2_EVENT` log lists only those `cmd_name`s; `git status --porcelain` empty at the end; no `.bak` beside the file | another git command or a stray file appears |
| B8 no shell sees `from`/`to`/`name` | `mutate.test.mjs`: a list whose `from`, `to` and `name` contain `& echo X > pwned.txt` and `"`; no `pwned.txt` | the list reaches a shell |
| B19 five files and policy name `npm run mutate` | `mutate.test.mjs` reads them | a file is missed |

No model calls and no external APIs. Each fixture repo is a temp directory;
no test touches this repository's source, and every test removes its temp
directory and any process it started.

## Validation

- `npm run verify` green (lint, the kit's tests including the new files, the
  product's tests).
- `npm run check:intent` PASS (type feature, with a spec and a plan).
- `npm run size:baseline` prints `{}`.
- **Live check (owed by rule 3, not by path): the owner, in the worktree:**
  1. `npm run mutate -- intents/3-mutate-command/mutants.json`: five result
     lines (four KILLED, one SURVIVED: the equivalent `DOCS.includes(wanted)`
     removal), a summary line, and `git status --short` empty afterwards.
  2. `npm run mutate -- intents/3-mutate-command/mutants.json --min-free-mb 99999999`:
     the line `stopped before <name> …`, exit code 3 (`echo %ERRORLEVEL%`),
     and `git status --short` empty.
  3. Start step 1 again and stop it with Ctrl+C while a mutant is running,
     check `src/core/hash.mjs` is mutated (`git diff --stat`), then run
     `npm run mutate -- … --resume` and see `recovered …` first and a clean
     tree at the end.
  4. Read the five edited agent and skill texts for sense.

## Assumptions I made

- **AC6's recording** uses `GIT_TRACE2_EVENT` (Risks). The observable is the
  same as a wrapper's: every git command the run made, with its name.
- **The shell for the suite command** is `cmd.exe` on Windows and `sh`
  elsewhere, through `child_process.spawn(commandString, { shell: true })`
  with a string made only from `SUITES`; the target's `package.json` defines
  what each name runs.
- **Where the recorded failing test names come from:** the `not ok <n> - <name>`
  lines of `node --test`'s default (TAP-like) reporter output and the first
  line starting `error` or containing `✖`/`error ` for lint, as the
  scratchpad harness parsed. If a different reporter is configured the line
  falls back to `exit <code>` (B12).
- **The five mutants for AC12** (`src/core/hash.mjs`; the implementer checks
  that each `from` matches once and records what it printed):
  1. `m[2] && DOCS.includes(m[2]) ? m[2] : null` → `m[2] ? m[2] : null`
     (killed: "an unknown document keeps the intent and drops the doc");
  2. `id: Number(m[1])` → `id: m[1]` (killed: the id is a number);
  3. `return DOCS.includes(doc) ?` → `return true ?` (killed: "omits an
     unknown document");
  4. `return DOCS.find(has) ?? null;` → `return DOCS[0];` (killed: "falls back
     past a missing first document");
  5. `wanted && DOCS.includes(wanted) && has(wanted)` → `wanted &&
     has(wanted)` (survives: equivalent, as §1's round 2 recorded as PD2).
  If one of them turns out not to behave so, the implementer swaps it for
  another with the stated result and says so in Progress.
- The default floor (1024 MB) and timeout (300 s) are the spec's guesses and
  are left as it states them.
- No new dependency: `node:fs`, `node:os`, `node:child_process`, `node:path`,
  `node:test` only.

## Progress

<!-- The implementer appends here, one entry per phase: date, commits, what
shipped, test counts, anything that diverged from the plan. Nothing above
this line is the implementer's to edit. -->
