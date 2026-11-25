<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §3 — A kit command that runs a review's mutants one at a time

**Type:** feature
**Originator:** me (the owner), from `docs/sdlc-grid.md` (2026-11-25), move 2
**Source:** `intents/1-local-intent-map/review.md` (rounds 1 and 2),
`docs/sdlc-grid.md` → "The two we move", move 2 (Deploy → L2)

## Problem

Review pass 4 is the expensive one. `REVIEW-POLICY.md` → Passes → 4 says:
"Enumerate mutations from the diff, one per changed behavioural line. Revert
each one, run the full suite, and confirm that something fails. Guard the
harness by asserting that the file actually changed. Report killed and
survived mutants per line." `.claude/skills/review/SKILL.md` adds "back up
and restore files yourself (never `git checkout --`)".

Today that is a prompt, not a command. Each reviewer writes its own harness,
and on §1 the harness ran out of the machine's memory twice:

- **Round 1:** the coordinator's own re-check of 25 surviving mutants was
  stopped by the system ("stopped because the system is running low on
  memory") after 15 mutants. It was left with `src/server/static.mjs` mutated
  and a `.bak-mutant` file beside it; the file was restored by hand from that
  copy.
- **Round 2:** the reviewer's batch was stopped partway through mutant P8
  (about 5 of 46 planned mutants had run validly), left `src/server/repo.mjs`
  mutated, and its report said "Round 2 is incomplete". The coordinator then
  ran the remaining 38 mutants with the reviewer's script, kept only in the
  session's scratchpad.
- Round 2's script also had defects the reviewer found only after running it:
  patterns that matched nothing because the worktree files use CRLF line
  endings, and replacement strings that lost their backslashes. Its own
  report called those mutants "void".

The script that finally worked did several things no prompt guarantees:
back up by copy; require exactly one match for the pattern; check
`git diff --quiet` to prove the file changed; run one mutant at a time;
restore by copy and check the restore; kill orphaned fixture children
(`queue.mjs` processes whose parent had exited); and append a result line per
mutant to a file. Nothing in the repository holds it.

## Outcome

- `npm run mutate -- <file>` (name open) reads a committed list of mutants
  (each with a name, a target file, the exact text to replace and its
  replacement, and which suite to run), applies each one in turn to a
  worktree, runs that suite, and prints one line per mutant: killed (and by
  which test) or survived, or "not applied" with the reason.
- A mutant that matches zero or more than one place is reported as not applied
  and never counted as killed or survived.
- After every mutant, and after an interrupted run, the target file equals its
  committed content again, and `git status --short` is clean. A later run
  restores a file an earlier, killed run left mutated before it starts.
- Mutants run strictly one at a time, and a run says what it is waiting on, so
  a stop for low memory leaves a result file saying how far it got and a rerun
  continues from there.
- `/review`, the reviewer agent and `/auto` step 6 name the command, so pass 4
  and the coordinator's re-check run the same code.

## Constraints

- **Kit only.** The command mutates files in a worktree and nothing else; it
  never commits, resets, stashes or runs `git checkout --`. It runs only the
  suite the list names.
- **Needs only Node ≥ 22**, like the kit's other scripts: no new dependency.
- **Cost and memory:** one test process at a time; never several suites in
  parallel. A mutant has a timeout so a hung fixture cannot hold the run.
- **Autonomy:** it records results but does not decide a verdict. The reviewer
  and the coordinator still read the results.
- **Tier:** it adds a kit script and edits `.claude/skills/review/SKILL.md`,
  `.claude/agents/sdlc-intent-map-reviewer.md` and
  `.claude/skills/auto/SKILL.md`; the last three are on `REVIEW-POLICY.md`'s
  Reviewed paths, so the path table makes this change Reviewed.
- **Tests never touch a real product repo.** The command's own tests use a
  throwaway repo built in a temp directory.
- **Out of scope:** choosing which lines to mutate (the reviewer still reads
  the diff and writes the list), automatic generation of mutants, running on
  macOS or Linux beyond what Node gives for free, and the page test (§4).

## Type-specific questions

### Feature
- **Users:** the reviewer agent (`/review` pass 4), the coordinator (`/auto`
  step 6's re-check and `/konmari`'s re-applied mutants), and the owner when
  checking a result by hand.
- **What exists today:** a prompt (`REVIEW-POLICY.md` pass 4, the reviewer
  agent's text and `/review`'s step 3) and, for §1, two throwaway scripts in a
  session's scratchpad. Nothing in the repository.
- **Open design questions:**
  - **Specifying a mutant.** A JSON or `.mjs` file of `{ name, file, from, to,
    suite }` entries, as in the scratchpad script? Where does the reviewer's
    list live: in `review.md`, in the intent's folder (for example
    `intents/<id>-<slug>/mutants.mjs`), or outside the repository? Line
    endings: does `from` match the file's text as it is (CRLF included) or
    after normalising, and is the file written back byte-for-byte?
  - **The memory guard.** What stops a run, and what does it leave? A
    `--timeout` per mutant, a resumable results file, a check of free memory
    before each mutant (and what threshold, on Windows), or only one process
    at a time?
  - **Interrupted runs.** Where is the backup kept (beside the file, as in
    the scratchpad script, or under `.git/`), and how does the next run find
    and restore it?
  - **Orphaned children.** The scratchpad script killed fixture `queue.mjs`
    processes whose parent had exited, using PowerShell. Is that part of the
    command (and then how, off Windows), or does the test harness own
    cleaning up its children, so the command never kills a process?
  - **Who runs it.** The reviewer agent, the coordinator, or both? `/auto`
    step 6 says to re-run "every mutant the review lists as surviving" and
    "every mutant the round's resolutions say a rework now kills"; does the
    command take those lists from a prior `review.md`?
  - **The report.** What does it print and write: the line format
    (`name file: Lnn KILLED by <test> | SURVIVED | NOT APPLIED`), a results
    file, and a total? How does `review.md` quote it?
  - **The suites.** `node --test "src/**/*.test.mjs"`, the kit's
    `scripts/*.test.mjs`, or lint, chosen per mutant as the scratchpad script
    did (`app`, `kit`, `app+lint`)? Or one `verify`-style command?

## Assumptions I made

- The owner's "go" means: draft it now, with the questions above left to the
  spec rather than asked.
- The command is a kit command (`scripts/`, a `package.json` script), because
  both the reviewer and the coordinator need it from any worktree.
- The tier is left to the path table (Reviewed, since three skill and agent
  files change); no raise in `review_tier`.
- One suite process at a time is the minimum; the spec decides whether a
  memory check is also needed.
- The facts about round 1 and round 2 are from this session's own logs and the
  committed `review.md`; the scratchpad script is not in the repository, so
  the spec can only cite its behaviour as described in `review.md`, not quote
  it.
- No `blocked_by`: nothing else must merge first. It is related to §4 (the
  page test will need mutants) and to §5, which touch the same code the review
  mutates; recorded under links only.
