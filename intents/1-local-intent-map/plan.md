<!-- generated-by: sdlc-intent-map/build-plan@0.3.0 -->
# §1 plan — Stack, skeleton and a first intent map served on localhost from a repo

Intent: [intent.md](intent.md) · Spec: [spec.md](spec.md)

Approved before any code exists. If the plan turns out wrong mid-execution,
stop, fix the plan, and re-approve — don't push through.

## Goal

Ship the first product code: a Node ≥ 22 server, started with
`npm start -- <repo>`, that serves on `127.0.0.1:5300` an intent map of
any SDLC-kit repository. It gets the board from that repo's own
`scripts/queue.mjs --json`, the documents from `git show` on the ref the
queue used, and renders them in a plain-ES-module page with no build and no
network access. At the same time it does §1's bookkeeping: `verify` gains
lint and the product's tests, `CLAUDE.md` → "Architecture" and
`docs/architecture.md` describe the layers, `CORE_CODE`, `BUDGETED` and the
size baseline are narrowed, `REVIEW-POLICY.md` names the live-check paths,
and `setup:worktree` is `npm ci` (spec B1–B26, AC1–AC14).

## Risks

- **Pass 9 lists no repository footguns yet** (`REVIEW-POLICY.md:180`
  "This list starts empty"), so the risks below are this change's own.
- **Running the target repo's code** (spec I1). A bug or hang in its
  `queue.mjs` must not hang the server: run it with `execFile`, the 30 s
  timeout, a capped `maxBuffer`, and `process.execPath` (not `node` from
  `PATH`).
- **Path traversal and command injection** through `/api/intent/<id>`:
  ids are matched by `^\d+$` before anything else; git is always called
  with an argument array; document names come from a fixed list.
- **DNS rebinding**: a page on another site resolving to `127.0.0.1` could
  read intents. The `Host` header check (spec, Non-functional → Security)
  must run before routing, and have its own test.
- **XSS through Markdown.** Rendering is the page's only HTML sink. A test
  must prove the sanitiser removes script, handlers and `javascript:` URLs
  *with the exact configuration the page uses* (one shared module, not a
  copy in the test).
- **Tests that pass whatever the code does.** The layout tests must assert
  positions and arrow endpoints by id, not only counts; the API tests must
  use a fixture where `main` and the branch hold *different* `spec.md`
  text, so reading the wrong ref fails (AC5).
- **Fixture drift.** The fixture copies this repo's kit scripts into a
  temp repo. If the kit's `queue.mjs` gains an import, the fixture breaks
  loudly: copy the whole list from one constant and fail with the missing
  file's name.
- **Windows paths and line endings.** The owner runs on Windows: `git show`
  output may carry `\r\n`; the repo path may use backslashes. Normalise both,
  and run the suite on this machine.
- **Editing kit-enforcement files raises the tier.** `REVIEW-POLICY.md:30`
  lists "this file; the kit's enforcement (`scripts/intent-check-lib.mjs`, …)"
  as **Reviewed**. Subtask 5 edits both, so this change is Reviewed: the
  owner reads the diff.
- **Kit tests pin today's patterns.** `scripts/size-budget-lib.test.mjs:24`
  expects `server/saveApi.ts`, `tools/…`, `app/main.go` and `src/pkg/agent.py`
  to be budgeted. Narrowing `BUDGETED` must update those cases in the same
  commit, not delete them.
- **Stale citations.** Line numbers below were read at `0179ff0`; re-check
  before launch if `main` moves.

## Verified against the codebase

Re-read on `main` at `0179ff0`.

- `package.json:9` — `"test:kit": "node --test \"scripts/*.test.mjs\""`.
- `package.json:17` — `"verify": "npm run test:kit"`; no dependencies.
- `.gitignore:1` — `node_modules/` already ignored.
- `scripts/queue.mjs:22` — `const root = git(process.cwd(), 'rev-parse',
  '--show-toplevel');`: the queue works on whatever repo is the working
  directory, so running it with `cwd: <target>` reads the target.
- `scripts/queue.mjs:95-96` — `--json` prints `queueData(collectEntries(),
  { knownIds: allIntentIds() })`.
- `scripts/queue.mjs:14-19` — its imports: `blockers-lib.mjs`,
  `intent-check-lib.mjs`, `queue-lib.mjs`, `session-io.mjs`; through them
  `session-lib.mjs` (`queue-lib.mjs:6`, `session-io.mjs:9`). These six files
  are what the fixture copies.
- `scripts/queue-lib.mjs:137-159` — `queueData`: groups `inFlight`,
  `queued`, `shipped`, `stopped`, `other`, plus `problems`; per intent `id,
  slug, title, type, status, gates, auto, source, merged, blocked_by[{id,
  reason}], blocked_by_open`.
- `scripts/queue-lib.mjs:8-16` — `GROUP_OF_STATUS`.
- `scripts/session-io.mjs:12-14` — `git(cwd, ...args)` with `execFileSync`
  and an argument array.
- `scripts/session-io.mjs:54-78` — `readIntentMetadataFromBranch(root,
  id)`: returns `{ dir, metadata, branch }` for the one local branch whose
  `parseBranch(b)?.id` matches, `null` when none, throws when more than one.
- `scripts/intent-check-lib.mjs:28` — `BRANCH_RE =
  /^(?:codex\/)?(feat|fix|refactor|adjust|exp)\/(\d+)-([a-z0-9][a-z0-9-]*)$/`.
- `scripts/intent-check-lib.mjs:154` — `export const CORE_CODE =
  [/^src\//];`, with the comment at `:146` "§1 narrows CORE_CODE".
- `scripts/size-budget-lib.mjs:30` — `BUDGETED =
  [/^(src|scripts|server|tools|lib|app)\/.+\.(ts|…|swift)$/]`.
- `scripts/size-budget-lib.mjs:33-38` — `BUDGET_EXCLUDE` already excludes
  tests, `tests?/`, `generated/`, `vendor/`, `node_modules/`.
- `scripts/size-budget-lib.test.mjs:24` — the budgeted examples listed in
  Risks.
- `scripts/size-baseline.json` — `{}` (no file over 500 lines yet).
- `scripts/session-lib.mjs:19-20` — `portFor(id)` is `5200 + (id % 100)`,
  so 5300 is outside every spawned port.
- `scripts/spawn-intent.mjs:74` — `SETUP_COMMAND = 'npm run
  setup:worktree --if-present'`.
- `REVIEW-POLICY.md:77-79` — live-check rule 1: "§1 adds the product's
  entry points, UI and integration adapters; until then this rule names
  nothing".
- `REVIEW-POLICY.md:30` — the Reviewed row, including "**and, by meaning
  until §1 names the paths:** …".
- `CLAUDE.md:139-160` — "## Architecture": "None yet. §1 writes this
  section", and the five obligations.
- `docs/architecture.md` — principles 1 and 2 are `<§1: …>` placeholders.
- Node on this machine: v22.18.0. Latest on npm (2026-11-24): `marked`
  18.3.0, `dompurify` 3.5.0, `jsdom` 31.0.1, `eslint` 10.15.0,
  `@eslint/js` 10.0.1, `globals` 17.14.0.

## Where this goes

- **Modules touched:** `package.json`, `scripts/intent-check-lib.mjs`
  (`CORE_CODE`), `scripts/size-budget-lib.mjs` (`BUDGETED`),
  `scripts/size-budget-lib.test.mjs`, `scripts/size-baseline.json`,
  `CLAUDE.md`, `docs/architecture.md`, `REVIEW-POLICY.md`.
- **New modules:**
  - `src/core/hash.mjs` — parses and builds `#i-<id>-<doc>` (B20).
  - `src/core/layout.mjs` — turns queue JSON into columns, counters with
    positions and state lines, arrows with endpoints, and tooltips
    (B11–B14).
  - `src/core/docref.mjs` — given an intent's queue `source` and the branch
    lookup result, chooses the ref and folder to read documents from (B7,
    I3).
  - `src/server/repo.mjs` — all I/O on the target repo: checks it (B3),
    runs `queue.mjs` (B5–B6), finds the intent folder on a ref and reads
    documents with `git show` (B7–B9).
  - `src/server/server.mjs` — the HTTP server: `Host` check, routes
    `/api/queue`, `/api/intent/<id>`, static files (B2, B5, B8).
  - `src/server/static.mjs` — maps the fixed URL prefixes to files:
    `/` → `src/web/index.html`, `/web/*` → `src/web/`, `/core/*` →
    `src/core/`, `/vendor/marked.js` and `/vendor/purify.js` → the two
    packages' ES-module builds in `node_modules` (B22).
  - `bin/intent-map.mjs` — parses `<repo>` and `--port`, starts the server,
    prints the URL or the refusal (B1–B3).
  - `src/web/index.html`, `src/web/style.css` — the page and its palette
    (B10, B12, B22).
  - `src/web/app.mjs` — fetches the API, draws the board from
    `layout.mjs`, runs the reader, picker and hash (B10–B21).
  - `src/web/render.mjs` — `renderMarkdown(md, { marked, DOMPurify })`:
    the single Markdown-to-safe-HTML function, dependencies injected so the
    test runs it under jsdom with the same configuration (B18).
  - `src/test/fixture-repo.mjs` — test helper: builds a temp git repo with
    the kit's queue scripts and given intents on `main` and branches.
  - `eslint.config.mjs` — the lint configuration.
- **Why there:** B24 fixes the layers. Layout, hash and ref choice are
  logic, so principle 3 and 9 put them in `src/core/`, pure and
  unit-tested, and served to the browser as-is (no copy, principle 4).
  `repo.mjs` holds every target-repo I/O call so `server.mjs` only wires.
  `repo.mjs` reuses `readIntentMetadataFromBranch` and `git` from
  `scripts/session-io.mjs` rather than re-implementing the branch rule
  (principle 5): server code may import the kit's `scripts/`; `src/core/`
  and `src/web/` may not (they would pull in `node:`). That import is
  recorded in `docs/architecture.md` as part of principle 2.
- **Budget lines:** none. No file is over 500 lines, and none of the new
  ones should approach it (`app.mjs` is the largest, expected ~250).

## Subtasks

Each ends with `npm run verify` green and a commit.

1. **Skeleton and guardrails.** `package.json`: `"start": "node
   bin/intent-map.mjs"`, `"lint": "eslint src bin"`, `"test:app": "node
   --test \"src/**/*.test.mjs\""`, `"verify": "npm run lint && npm run
   test:kit && npm run test:app"`, `"setup:worktree": "npm ci"`;
   dependencies pinned exactly (see Assumptions); `package-lock.json`
   committed. `eslint.config.mjs` (`@eslint/js` recommended, browser
   globals for `src/web/`, node globals elsewhere). `src/architecture.test.mjs`
   (AC12): reads every `import … from '…'` and `import('…')` in `src/core/`
   and `src/web/`, fails on the forbidden ones; a second case plants a bad
   import in a temp copy and proves the rule fires. Check that
   `node_modules/marked/lib/marked.esm.js` and
   `node_modules/dompurify/dist/purify.es.mjs` exist after install; if a
   path differs, use the package's own ESM entry from its `package.json`
   `exports` and note it in Progress.
2. **Core logic.** `src/core/hash.mjs` + test (AC9);
   `src/core/layout.mjs` + test (AC7, AC8) from queue-JSON fixtures in
   the test file; `src/core/docref.mjs` + test (I3: `branch` → branch ref,
   `main` and `branch conflict` → `main`, no branch found → `main`).
   Code comments for I4, I5, I6 at their sites.
3. **Server.** `src/test/fixture-repo.mjs`; `src/server/repo.mjs`,
   `src/server/static.mjs`, `src/server/server.mjs`, `bin/intent-map.mjs`;
   tests `src/server/cli.test.mjs` (AC1, AC2), `src/server/api.test.mjs`
   (AC3–AC6, `Host` refusal). Code comments for I1, I2 at the queue
   runner, I3 at the document reader.
4. **Page.** `src/web/index.html`, `style.css`, `app.mjs`, `render.mjs`;
   tests `src/web/render.test.mjs` (AC10, under jsdom) and
   `src/server/static.test.mjs` (AC11: every `src=`, `href=`, `url(`,
   `import … from` and `fetch(` in `src/web/` and `src/core/` is relative
   or root-relative; and `/vendor/*.js` are served). Run the server
   against this repo and Héraklios by hand and note what was seen in
   Progress (evidence, not the live check).
5. **Bookkeeping (B26).** `CORE_CODE = [/^src\/core\//]`;
   `BUDGETED = [/^(src|bin|scripts)\/.+\.(mjs|js)$/]`, with
   `size-budget-lib.test.mjs:24`'s examples changed to
   `src/core/layout.mjs`, `src/server/repo.mjs`, `bin/intent-map.mjs`,
   `scripts/deliver.mjs`, `src/x.js`, and the dropped stacks moved to the
   "does not budget" list; `npm run size:baseline -- --write`.
   `CLAUDE.md`: the overview's "So far the repository holds only…"
   paragraph, "Commands" (`npm start -- <repo>`, `lint`, `test:app`), and
   "Architecture" (B24's module map, the pure/I-O boundary, the kit-import
   exception). `docs/architecture.md`: principles 1 and 2 filled in, both
   *Enforced* by `src/architecture.test.mjs`. `REVIEW-POLICY.md`: rule 1
   names `bin/**`, `src/server/**`, `src/web/**`; the Reviewed row's "by
   meaning" clause says no product path matches it yet and model prompts,
   outbound messages, credentials and personal data stay Reviewed by
   meaning. Then set `status: in-review`.

## Tests

| Behaviour | Test | Would fail if |
| --- | --- | --- |
| B1 default port 5300, `--port`, default repo = cwd | `cli.test.mjs` | the default or flag parsing changes |
| B2 binds `127.0.0.1` | `cli.test.mjs`: `server.address().address === '127.0.0.1'` | bound to `0.0.0.0` or `::` |
| B3 refusals (not git, no `main`, no `queue.mjs`, port taken) | `cli.test.mjs`: four cases, exit code ≠ 0 and the reason in stderr | any check is removed |
| B5 queue fresh per request, plus `repo`, `main`, `at` | `api.test.mjs`: compare with `queue.mjs --json` in the fixture; commit a new intent; request again | a cache is added, or a field dropped |
| B6 queue failure → error | `api.test.mjs`: fixture `queue.mjs` replaced by `process.exit(1)` and by `console.log('x')` | errors are swallowed into an empty map |
| B7, I3 ref choice | `docref.test.mjs` (pure) and `api.test.mjs` (branch `spec.md` ≠ main `spec.md`) | the ref is flipped or the working tree is read |
| B8 doc set, `null` for missing, 404s | `api.test.mjs`: unknown id, `..%2F..`, `abc`, `-1` | the id check is loosened |
| B9 read-only | `api.test.mjs`: `git status --porcelain` empty and `git for-each-ref` identical before and after the suite | the server writes anything |
| Host check | `api.test.mjs`: `Host: evil.example:5300` → 403; `localhost:<port>` and `127.0.0.1:<port>` → 200 | the check is removed or reordered after routing |
| B11 columns, 5 shipped, stopped omitted, Other only when non-empty | `layout.test.mjs` | any status moves column or the cap changes |
| B12 state line | `layout.test.mjs`: `IN-REVIEW · I·P · auto · r1`, `ACCEPTED · I·S·P · BLOCKED` | a part is dropped or reordered |
| B13, I5 arrows | `layout.test.mjs`: direct open blocker on board → arrow with `from`, `to`, `reason`; merged blocker → none; further (non-direct) blocker → none; off-board blocker → tooltip | arrows use `blocked_by` instead of open direct ones, or swap ends |
| B14 deterministic | `layout.test.mjs`: same input twice → deep-equal output; endpoints equal the counters' edges | layout depends on anything but the input |
| B15 problems | `layout.test.mjs`: `problems` passed through | dropped |
| B16 shipped list order | `layout.test.mjs` | reordered |
| B18 sanitising | `render.test.mjs` under jsdom: `<script>`, `<img onerror>`, `[x](javascript:alert(1))` gone; a GFM table survives | the sanitiser is bypassed or misconfigured |
| B20 hash | `hash.test.mjs`: `#i-87`, `#i-87-review`, `#i-87-bogus`, `#x`, `#i-87-konmari` | the pattern changes |
| B22 no external host | `static.test.mjs` scan | a CDN URL is added |
| B24 import rules | `architecture.test.mjs`, with a planted violation | the rule stops firing |
| B10, B17, B19, B21, B22 (look, keyboard, dark mode) | live check (AC14) | — no automated test; presentation only |

No model calls and no external APIs; nothing to fake beyond the temp git
repos. Every test that starts a server uses port 0 and closes it.

## Validation

- `npm run verify` green (lint, kit tests, product tests).
- `npm run check:intent` PASS on `feat/1-local-intent-map`.
- `npm run size:baseline` matches the committed baseline.
- On a fresh worktree: `npm run setup:worktree && npm run verify` green
  (AC13).
- **Live check (owed by rule 1: `bin/**`, `src/server/**`, `src/web/**`):**
  the owner runs `npm start -- C:/Users/eric/src/heraklios`, opens
  `http://localhost:5300/`, and checks:
  1. the open intents sit in the right columns and the blocker arrows match
     `npm run queue` in Héraklios;
  2. a counter, a shipped row and the picker each open the reader; tabs
     switch by click and by Left/Right; missing documents are disabled;
  3. `http://localhost:5300/#i-<id>-review` opens that review directly;
  4. dark mode (system setting) looks right;
  5. after a commit that changes an intent's `metadata.yml` in Héraklios, a
     reload shows the change;
  6. with Wi-Fi off, a reload shows the page whole (no missing styles or
     scripts);
  7. the same against this repo (`npm start`).

## Assumptions I made

- **Dependencies** (each pinned exactly in `package.json`):
  - `marked` 18.3.0 (runtime) — GFM Markdown to HTML in the browser
    (B18); the artifact already used it; no smaller GFM renderer with
    tables is as widely maintained.
  - `dompurify` 3.5.0 (runtime) — sanitises that HTML (B18); the standard
    browser sanitiser, also used by the artifact.
  - `jsdom` 31.0.1 (dev) — a DOM for DOMPurify in `render.test.mjs`, so
    AC10 tests the real sanitiser in Node.
  - `eslint` 10.15.0, `@eslint/js` 10.0.1, `globals` 17.14.0 (dev) — the
    lint step `CLAUDE.md:31` asks `verify` to gain; `@eslint/js`'s
    recommended rules only, no plugins.
- Lint covers `src/` and `bin/`, not the kit's `scripts/`, so §1 does not
  restyle the kit.
- The two packages are served from `node_modules` by fixed routes, not
  vendored into the repo, since `setup:worktree` installs them anyway.
- `src/server/` importing `scripts/session-io.mjs` is allowed and recorded
  (Where this goes); it keeps one definition of the branch rule.
- `OVERVIEW.md` is the owner's and is not edited here; the owner updates its
  Snapshot and Next after the merge.
- The node in `PATH` may differ from the one running the server; the queue
  runs with `process.execPath`.

## Progress

<!-- The implementer appends here, one entry per phase: date, commits, what
shipped, test counts, anything that diverged from the plan. Nothing above
this line is the implementer's to edit. -->
