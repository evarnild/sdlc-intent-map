<!-- generated-by: sdlc-intent-map/spec@0.3.0 -->
# §3 spec — A kit command that runs a review's mutants one at a time and restores every file

Accepted intent: [intent.md](intent.md)

Written against `main` at `839aa21`.

The spec decides **what** gets built. It points at existing sources rather
than repeating them, and records the decisions that have no other home.

## Sources that apply

| Source | What it settles |
| --- | --- |
| `intent.md` (§3) | Outcome and constraints: "Mutants run strictly one at a time", "A mutant that matches zero or more than one place is reported as not applied and never counted as killed or survived", "After every mutant, and after an interrupted run, the target file equals its committed content again", "it never commits, resets, stashes or runs `git checkout --`", "Needs only Node ≥ 22 … no new dependency". |
| `REVIEW-POLICY.md` → Passes → 4 | "Enumerate mutations from the diff, one per changed behavioural line. Revert each one, run the full suite, and confirm that something fails. Guard the harness by asserting that the file actually changed. Report killed and survived mutants per line." |
| `.claude/skills/review/SKILL.md` step 3 | "make one mutation per changed behavioural line, and run the full suite for each; back up and restore files yourself (never `git checkout --`); end with `git status --short` clean." |
| `.claude/agents/sdlc-intent-map-reviewer.md` | The reviewer is read-only apart from probing: "restore it immediately, end with `git status --short` clean", "Restore from a backup, never with `git checkout --`", "On Windows, `sed -i` rewrites line endings, so a mutated file stays 'modified' even after the text is put back", "Guard your own harness: assert that the file actually changed (`git diff --quiet` returns non-zero) before running." It lists survivors "by name with its target line: the coordinator re-runs those." Its tools are Read, Grep, Glob, Bash: it has no Write tool. |
| `.claude/skills/auto/SKILL.md` step 6 | "every mutant the review lists as surviving; every mutant the round's resolutions say a rework now kills"; "For a mutant: back up the target file by copy, apply the one-line change, run the full suite, restore by copy (never `git checkout --`), and end with `git status --short` clean." Any mismatch with what was quoted "stops the run". |
| `.claude/skills/konmari/SKILL.md` step 3, item 3 | "every mutant the latest `review.md` records as **killed** whose target file the tidy-up changed: re-apply it to the moved line by its recorded description (restore by copy, never `git checkout --`); each must still be killed". |
| `intents/1-local-intent-map/review.md` rounds 1 and 2, and this session's log | The failures this fixes: a stopped run left `src/server/static.mjs` and `src/server/repo.mjs` mutated; patterns written with `\n` matched nothing in CRLF files; replacement strings lost their backslashes; a `queue.mjs` fixture child outlived its mutant. The harness that finally worked is the behaviour to keep, and it is not in the repository. |
| `scripts/size-budget.mjs`, `scripts/size-budget-lib.mjs`, `scripts/expect.mjs` | The kit's pattern: a thin I/O script (`<name>.mjs`) over a pure `<name>-lib.mjs`, tests as `scripts/<name>*.test.mjs` on `node:test` with `scripts/expect.mjs`, run by `npm run test:kit`; the kit needs Node ≥ 22 and nothing else. |
| `package.json` scripts | `test:app`, `test:kit`, `lint` and `verify` are the suites a mutant can be checked against; the command reads their names, not their definitions. |

## Behaviour

### Calling it

- **B1.** `npm run mutate -- <list> [options]` runs the mutants in `<list>`
  against the working tree in `--dir` (default: the current directory). The
  options are `--only <name>[,<name>…]`, `--timeout <seconds>` (default 300, per
  mutant), `--min-free-mb <n>` (default 1024), `--results <file>` and
  `--resume`. Any other option, or no list, exits 2 with one line saying
  what is wrong.
- **B2.** `<list>` is a JSON file: an array of `{ "name", "file", "from",
  "to", "suite" }`. `name` is unique in the list, `file` is a path relative
  to `--dir` inside it (no `..`, not absolute), `from` is a non-empty string,
  `to` is a string (it may be empty), and `suite` is one of `app`, `kit`,
  `lint`, `verify`, or two or more joined by `+` (for example `lint+app`). A
  list that breaks any of these exits 2 and names the entry; nothing is
  mutated.
- **B3.** A suite name stands for the target's own npm script: `app` →
  `npm run test:app`, `kit` → `npm run test:kit`, `lint` → `npm run lint`,
  `verify` → `npm run verify`. A `+` list runs them in order and stops at the
  first that fails.

### Before it starts

- **B4.** The command starts by recovering from an earlier run that was
  stopped mid-mutant (B13), then refuses to go on unless `git status
  --porcelain` in `--dir` is empty, exiting 2 with the first dirty path. A
  mutant can then never be confused with someone's own edit.
- **B5.** It refuses to start when `--dir` is not a git work tree.

### Applying one mutant

- **B6.** For each mutant, in list order, it reads the target file as bytes,
  finds `from` in the file's text with line endings read as `\n` (both `\r\n`
  and `\n` in the file match a `\n` in `from`), and counts the matches.
  With zero or more than one match the mutant is **not applied**; its result
  says which (`0 matches` or `<n> matches`), and it goes on to the next. The
  file is not touched.
- **B7.** With exactly one match, it saves the file's bytes to a backup (B13),
  replaces the match with `to` and writes the file back using the file's own
  line ending (so a `to` with `\n` becomes `\r\n` in a CRLF file), and checks
  that the bytes on disk now differ from the backup. If they do not (`from` ==
  `to`), the mutant is **not applied** (`no change`) and the file is restored.
- **B8.** `from` and `to` are used as plain text. No part of either is read
  as a pattern, and no shell sees them.

### Running one mutant

- **B9.** After a mutant is applied it runs its suite (B3) as a child
  process in `--dir`, one at a time: the next mutant does not start until the
  child has exited and the file has been restored (B10).
- **B10.** When the suite ends, or is stopped by B11, the file's bytes are
  written back from the backup and compared with it. A mismatch ends the whole
  run with exit 4 and the line `RESTORE FAILED <file>` (the backup stays on
  disk for the owner).
- **B11.** A suite that has not ended after `--timeout` seconds is stopped:
  the command ends the child process **and the processes that child started**
  (on Windows `taskkill /T /F` on the child's pid; elsewhere a signal to the
  child's process group). It stops no other process. The result is `TIMEOUT`.
- **B12.** The result of a mutant is one of:
  - **KILLED**: the suite exited non-zero. The line names up to three of
    what failed: the names of the first failing tests (`not ok <n> - <name>`
    lines of `node --test`), or the first lint error line, or, when neither
    is found, the exit code.
  - **SURVIVED**: the suite exited zero.
  - **NOT APPLIED**: B6, B7.
  - **TIMEOUT**: B11. It is neither killed nor survived, and the summary
    counts it apart.

### Interrupted runs

- **B13.** Before it first changes a file, it records in a state file inside
  the target's git directory (`<git-dir>/sdlc-mutate/state.json`, never in the
  work tree) the mutant's name, the file's path and a copy of its original
  bytes (`<git-dir>/sdlc-mutate/original.bin`). It removes both after B10's
  check passes. The next run (B4) finds a state file, writes the saved bytes
  back to that file, checks them, removes the state, and says so on a line
  (`recovered <file> left mutated by <name>`) before anything else.
- **B14.** A result line is appended to the results file (`--results`,
  default `<git-dir>/sdlc-mutate/results.txt`) and flushed as soon as its
  mutant ends, not at the end of the run, so a run stopped from outside leaves
  every finished mutant's line.
- **B15.** With `--resume` the mutants that already have a line in the
  results file are skipped and their lines are not repeated; the summary
  counts them. Without it the results file is started afresh.

### The memory guard

- **B16.** Before each mutant it reads the free memory (`os.freemem()`). Below
  `--min-free-mb`, it applies nothing, waits up to 30 seconds in 5-second
  steps for it to rise, and if it has not, ends the run cleanly with exit 3 and
  the line `stopped before <name>: <free> MB free, <min> MB needed; rerun with
  --resume`. It never starts a second suite, and it stops no other process to
  make room.

### What it prints

- **B17.** One line per mutant on standard output, as it ends:
  `<name> <file>:L<line> KILLED by <names> | SURVIVED | NOT APPLIED (<why>) |
  TIMEOUT` where `<line>` is the line of the first match (1-based, counting
  `\n`). Then one summary line: `killed <n> · survived <n> · not applied <n>
  · timeout <n> · skipped <n>`. The exit code is 0 when every mutant ran to a
  result (survivors do not make it non-zero: the reviewer judges them), 2 for
  a bad call, 3 for B16, 4 for B10.
- **B18.** It writes nothing in `--dir` except the target file of the mutant
  being run, and then only between B7 and B10. It never runs a git command
  that changes anything (`git status --porcelain` and `git rev-parse` only),
  never commits, resets, stashes or checks out.

### In the review flow

- **B19.** The four texts that tell an agent how to run pass 4 name this
  command instead of describing a hand-made harness: `.claude/skills/review/SKILL.md`
  step 3, `.claude/agents/sdlc-intent-map-reviewer.md` (and its Codex copy,
  `.codex/agents/sdlc-intent-map-reviewer.toml`), `.claude/skills/auto/SKILL.md`
  step 6, and `.claude/skills/konmari/SKILL.md` step 3, item 3.
  `REVIEW-POLICY.md` pass 4 gains one sentence: the mutants are run with
  `npm run mutate`, so the report quotes its lines. The reviewer writes the
  list file under its scratch directory, runs the command, and returns the list
  inside its report; the coordinator saves it as
  `intents/<id>-<slug>/mutants.json` when it writes `review.md`, and re-runs
  the survivors and the expected kills with `--only`.

## Interpretations

- **I1. "Needs only Node ≥ 22 … no new dependency"** (intent) is read as: the
  command uses only `node:` modules, and runs the target's own npm scripts.
  It does not need `eslint` or anything else itself. (Comment at the suite
  table.)
- **I2. "Never runs `git checkout --`"** (intent, reviewer agent) is read as
  also covering `git restore`, `git stash`, `git reset` and any `git` command
  that writes. Restoring is by writing the saved bytes. (Comment at the
  restore.)
- **I3. "The file actually changed"** (policy pass 4, reviewer agent) is
  proven by comparing bytes with the backup (B7), not by `git diff --quiet`,
  so it also works on a file git does not track and does not depend on git's
  line-ending conversion. The reviewer agent's wording still says `git diff
  --quiet`; B19 replaces it with this command.
- **I4. "Kill orphaned fixture children"** (the scratchpad script) is read as
  only the processes the command itself started (B11). A process an earlier,
  separate run left behind is not the command's to stop; the rule "never kill
  a process the run didn't start" (`.claude/skills/auto/SKILL.md` step 10)
  holds. Test fixtures that spawn children must end them themselves.
- **I5. A TIMEOUT is not a kill** (B12). A mutant that makes the suite hang
  is detected, but a suite that is slow because the machine is short of
  memory is not; the command cannot tell them apart, so it reports a third
  state and leaves the call to the reviewer. (The scratchpad run counted P8's
  timeout as "KILLED by suite error ETIMEDOUT"; here P8-like cases are
  reported as TIMEOUT and the reviewer judges.)
- **I6. Line endings.** The reviewer agent says "On Windows, `sed -i` rewrites
  line endings". The command never normalises a file's line endings: it
  matches on `\n` form and writes back in the file's own form (B6, B7), and
  restores by bytes.

## Acceptance criteria

Tests build a throwaway git repository in a temp directory: a `package.json`
with `test:app`, `test:kit`, `lint` and `verify` scripts that run tiny
`node --test` files and a small `eslint`-free lint script, one source file
`calc.mjs` (LF) and one `crlf.mjs` (CRLF), committed. No test touches this
repository's own source.

- **AC1** (B1, B2, B3): a list with a duplicate name, an absolute or `..`
  path, an empty `from`, an unknown suite, or no list, exits 2 naming the
  problem and leaves the repo untouched; `lint+app` runs both in order.
  *Test:* `scripts/mutate.test.mjs`; the list checks and suite parsing in
  `scripts/mutate-lib.test.mjs`.
- **AC2** (B4, B5): a dirty tree, and a directory that is not a git work
  tree, exit 2 before any file is touched. *Test:* `mutate.test.mjs`.
- **AC3** (B6, B8): `from` matching 0 places and 2 places are NOT APPLIED
  with `0 matches` and `2 matches`; `from` containing regex characters
  (`.*`, `\d`, `$`) matches only as text; the file is unchanged afterwards.
  *Test:* `mutate-lib.test.mjs` (pure matching) and `mutate.test.mjs`.
- **AC4** (B6, B7, I6): a multi-line `from` written with `\n` matches in
  both `calc.mjs` (LF) and `crlf.mjs` (CRLF); the mutated CRLF file still
  uses `\r\n` on every line; after the run both files are byte-identical to
  their commits. A `from` equal to `to` is NOT APPLIED (`no change`). *Test:*
  `mutate-lib.test.mjs` (`applyMutant`) and `mutate.test.mjs`.
- **AC5** (B9, B12): a mutant the tests catch is KILLED and names the failing
  test; one they do not is SURVIVED; a lint-only failure is KILLED with the
  lint line; mutants run in list order and the second does not start until
  the first's file is restored (the test records timestamps and the file's
  bytes at each suite start). *Test:* `mutate.test.mjs`.
- **AC6** (B10, B18): when the restore would not match (the test makes the
  suite rewrite the file), the run exits 4 with `RESTORE FAILED`; otherwise
  `git status --porcelain` is empty at the end and no `git` subcommand other
  than `status` and `rev-parse` was run (the test puts a `git` wrapper first
  on `PATH` that records its arguments). *Test:* `mutate.test.mjs`.
- **AC7** (B11): a suite that sleeps beyond `--timeout 1` is TIMEOUT, the
  child and its own child are gone afterwards (their pids are checked), a
  process the test started beforehand is still running, and the file is
  restored. *Test:* `mutate.test.mjs`.
- **AC8** (B13, B14, B15): a state file and a mutated file left by a run the
  test killed are put back by the next run before it starts, with the
  `recovered` line; results lines exist for every finished mutant after a
  run stopped partway; `--resume` skips them and repeats none. *Test:*
  `mutate.test.mjs`.
- **AC9** (B16): with `--min-free-mb` set above the machine's free memory,
  nothing is applied, the exit code is 3 and the message names the next
  mutant; with it at 0 the run proceeds. *Test:* `mutate.test.mjs`.
- **AC10** (B17): the line format and the summary line, and the exit codes,
  for a mixed list. *Test:* `mutate-lib.test.mjs` (`formatResult`,
  `summary`) and `mutate.test.mjs`.
- **AC11** (B19): each of the five files (`review/SKILL.md`,
  `sdlc-intent-map-reviewer.md`, `sdlc-intent-map-reviewer.toml`,
  `auto/SKILL.md`, `konmari/SKILL.md`) and `REVIEW-POLICY.md` contains
  `npm run mutate`. *Test:* a check in `scripts/mutate.test.mjs` reading those
  files. Whether an agent follows the text is a live check.
- **AC12** (live): the owner runs `npm run mutate -- intents/3-mutate-command/mutants.json`
  in the worktree on this repository's own code (a committed list of five
  mutants of `src/core/hash.mjs`, which the plan writes), sees five lines
  and a summary, `git status --short` empty afterwards, and, with
  `--min-free-mb 99999`, the memory stop and a clean tree. *Live check*
  (owed by rule 3: the memory behaviour and a real suite run cannot be shown
  by the temp-repo tests alone).

## Non-functional

- **Boundaries:** `scripts/mutate-lib.mjs` is pure (list validation, matching,
  applying, result and summary lines, parsing failing test names) with no `fs`
  or `child_process`; `scripts/mutate.mjs` is the I/O (git, files, child
  processes, memory, results file); `scripts/mutate-lib.test.mjs` and
  `scripts/mutate.test.mjs` test them. This is the kit's own pattern
  (`size-budget-lib.mjs` over `size-budget.mjs`); no product module is touched.
- **Data:** none stored beyond the files in the target's git directory
  (state, backup and results), which are not committed. A mutant's text is
  whatever the reviewer wrote; the command prints names and test names only,
  never the file's contents.
- **Model use:** none.
- **Autonomy:** it applies one reviewer-written change at a time to a clean
  work tree and always puts the file back; it records results and does not
  decide a verdict. It starts no process other than the target's own npm
  scripts, and stops only the ones it started.
- **Cost:** one suite process at a time; each mutant has a timeout; the
  memory check is a read. On this repository a mutant costs one `test:app`
  run (about 10 s) or one `verify` (about 25 s, more under load).
- **Tier:** Reviewed, by the path table (three agent and skill files change).

## Out of scope

Choosing which lines to mutate and writing the list (the reviewer still reads
the diff), generating mutants automatically, running suites in parallel,
reading the machine's memory by any means other than `os.freemem()`,
stopping processes the command did not start, macOS and Linux beyond what
Node gives (the tests run on Windows; the process-group stop is written for
POSIX but not run there), committing the results, and rewriting past
reviews' lists. Also: a verdict from the results (survivors do not fail the
command), and the page test (§4).

## Assumptions I made

- **Specifying a mutant (open question 1):** a JSON file of `{ name, file,
  from, to, suite }` (B2). JSON is data only, so listing mutants executes
  nothing; a wrong escape shows as `0 matches`, never silently as a match. The
  list lives anywhere; by convention the coordinator saves it as
  `intents/<id>-<slug>/mutants.json` (B19). Line endings: matched as `\n`,
  written in the file's own style (B6, B7).
- **Memory guard (open question 2):** a free-memory floor before each mutant
  (B16), one process at a time (B9), a per-mutant timeout (B11) and a
  per-mutant results line (B14) with `--resume` (B15). The default floor
  (1024 MB) and timeout (300 s) are guesses; round 2's failures happened with
  about 4–5 GB reported free but heavy parallel load, so the floor may be too
  low to prevent them. The live check measures it.
- **Interrupted runs (open question 3):** the backup lives in the git
  directory (B13), not beside the file as the scratchpad script did, so
  `git status` never shows it and a recovery does not depend on a leftover
  `.bak` name.
- **Orphaned children (open question 4):** the command ends only its own
  child's tree (B11, I4). It does not use PowerShell to hunt orphans.
- **Who runs it (open question 5):** both. The reviewer runs the whole list;
  the coordinator re-runs survivors and expected kills with `--only`
  (`/auto` step 6) and the KonMari mutants (`/konmari` step 3). The reviewer
  has no Write tool, so it writes the list to its scratch directory with
  Bash; the coordinator commits the list.
- **The report (open question 6):** B17's line format is the one the
  scratchpad harness printed, with `NOT APPLIED` and `TIMEOUT` added.
  `review.md` quotes the lines.
- **The suites (open question 7):** a fixed table of four names mapped to
  the target's npm scripts (B3), so a mutant's suite is defined in one place
  (`package.json`), not in the list.
- The command's name is `mutate`, and its script file is
  `scripts/mutate.mjs`.
- `--timeout`'s unit is seconds and `--min-free-mb`'s is mebibytes.
- A clean tree is required (B4) even though a review of an in-review branch
  sometimes has an untracked `review.md` in progress. The reviewer runs from
  its read-only checkout, where `review.md` is not yet written; the
  coordinator runs the command before writing it.
- The five-mutant list for AC12 is written by the plan, over
  `src/core/hash.mjs`, whose tests are fast.
