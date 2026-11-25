<!-- generated-by: sdlc-intent-map/spec@0.3.0 -->
# §1 spec — Stack, skeleton and a first intent map served on localhost from a repo

Accepted intent: [intent.md](intent.md)

Written against `main` at `0179ff0`.

The spec decides **what** gets built. It points at existing sources rather
than repeating them, and records the decisions that have no other home.

## Sources that apply

| Source | What it settles |
| --- | --- |
| `intent.md` (§1) | Outcome and constraints: "Read-only on the repo it shows", "Local only … works offline: no fonts, scripts or styles from a CDN at runtime", "Untrusted Markdown", "One source of truth for the queue", "Tests never touch a real repo". |
| `CLAUDE.md` → "Architecture" | What §1 must also deliver: "narrows `CORE_CODE` in `scripts/intent-check-lib.mjs`", "fills in `docs/architecture.md`", "narrows `BUDGETED` and `BUDGET_EXCLUDE`", "names the runtime paths that owe a live check", "names the paths behind the Reviewed tier's 'by meaning' list", "defines `npm run setup:worktree` if a fresh worktree needs dependencies". |
| `CLAUDE.md` → "Commands" | "§1 extends `verify` with the product's build, lint and tests, whatever the stack is. Keep it **one** command." |
| `docs/architecture.md` | Principles 1–2 are placeholders: "§1 names the layers, says which import rules enforce them (a lint rule, or a test that proves each rule fires)". Principle 9: "New logic goes in pure functions with tests". |
| `scripts/queue.mjs` | The queue's own definition of an intent's state: `--json` "prints the groups as data", reading status "from the intent's branch while that branch exists and is not merged … else from main". |
| `scripts/queue-lib.mjs` → `queueData` | The JSON shape: groups `inFlight`, `queued`, `shipped`, `stopped`, `other`, `problems`; per intent `id, slug, title, type, status, gates, auto, source, merged, blocked_by[{id, reason}], blocked_by_open[]`. `GROUP_OF_STATUS` maps `accepted`, `in-progress`, `in-review` → `inFlight`; `draft` → `queued`; `done` → `shipped`; `abandoned`, `deferred` → `stopped`. Shipped are "newest merge first". |
| `scripts/session-io.mjs` → `readIntentMetadataFromBranch` | How an intent's branch is found: the local branch whose `parseBranch(b)?.id` is the intent's id; more than one is a conflict. |
| The Héraklios Intent Map artifact (read 2026-11-24) | The look and interactions being replaced: columns "RECENTLY SHIPPED · BUILD · REVIEW · PLANNED · WAITING · DRAFTS", red arrows for hard `blocked_by`, a shipped list, a reader with Intent / Spec / Plan / Review tabs, deep links `#i-<id>-<doc>` (`/^#i-(\d+)(?:-(intent\|spec\|plan\|review))?$/`). |
| `REVIEW-POLICY.md` → "Live checks", rule 1 | "§1 adds the product's entry points, UI and integration adapters". |

## Behaviour

### Starting the server

- **B1.** `npm start -- <repo>` (or `node bin/intent-map.mjs <repo>`)
  starts the server for the git repository at `<repo>`; with no argument,
  the current directory. `--port <n>` chooses the port; the default is
  **5300**, outside spawn's `5200 + (id mod 100)` range.
- **B2.** The server binds to `127.0.0.1` only and prints the URL to open
  (`http://localhost:<port>/`). It opens no browser itself.
- **B3.** It refuses to start, with one line saying why and a non-zero
  exit, when `<repo>` is not a git work tree, has no `main` branch, or has
  no `scripts/queue.mjs`. It also refuses when the port is taken, naming
  the port.
- **B4.** The repository is fixed for the server's lifetime. The page
  offers no way to choose another path.

### Where the data comes from

- **B5.** The queue is the target repo's own: each `GET /api/queue` runs
  `node scripts/queue.mjs --json` with the target repo as working
  directory, fresh on every request (no cache), and returns its JSON plus
  `{ repo: <name of the repo folder>, main: <short hash of main>, at:
  <ISO time> }`. Reloading the page therefore shows any change in the repo.
- **B6.** If `queue.mjs` fails, times out (30 s) or prints something that
  is not JSON, the request answers an error, and the page shows the error
  text in place of the map instead of an empty map.
- **B7.** A document is read with `git show <ref>:intents/<dir>/<doc>.md`,
  where `<ref>` is the intent's branch when the queue's `source` for it is
  `branch`, else `main`. The branch is the one local branch whose name
  parses to the intent's id (as `readIntentMetadataFromBranch` finds it);
  `<dir>` is the folder in that ref's `intents/` starting with `<id>-`.
  Documents are never read from the working tree.
- **B8.** `GET /api/intent/<id>` answers the intent's documents
  (`intent`, `spec`, `plan`, `review`, `konmari`; missing ones are
  `null`), its `metadata.yml` fields as the queue reports them, and the
  ref they were read from. An id that is not in the current queue answers
  404. No other path in the target repo can be requested.
- **B9.** The server runs only these git subcommands on the target repo:
  `rev-parse`, `for-each-ref`, `ls-tree`, `show`; plus the target's
  `scripts/queue.mjs`. It writes nothing to the target repo.

### The board

- **B10.** The page shows a header (repo name, `main` short hash, the time
  the data was read), the board, the reader, a legend and the shipped list.
- **B11.** The board has these columns, left to right, each listing its
  intents as counters:
  1. **Recently shipped**: the first 5 of the queue's `shipped` (newest
     merge first);
  2. **Build · review**: `in-progress` and `in-review`;
  3. **Planned · waiting**: `accepted`;
  4. **Drafts**: `draft`;
  5. **Other**: the queue's `other` group, shown only when non-empty.
  
  `stopped` intents are not on the board; they are in the picker (B19).
  Within a column, counters keep the queue's order.
- **B12.** A counter shows `§<id>`, the title (cut with "…" to fit), and a
  state line: the status in capitals, then the queue's `gates` and `auto`
  when not empty, then `BLOCKED` when `blocked_by_open` is not empty. Its
  colour follows its column (shipped green, build/review amber, planned
  blue, draft grey with a dashed border, as the artifact's legend).
- **B13.** For every intent on the board and every id in its
  `blocked_by_open` that is also in its `blocked_by` (a direct, open
  blocker) and on the board, a red arrow runs from the blocker's counter to
  the blocked one. Hovering or focusing an arrow shows "§<target> waits for
  §<source>: <reason>". An open blocker that is not on the board is named
  in the blocked counter's tooltip instead.
- **B14.** The layout (counter positions and arrow paths) is computed from
  the queue data alone, so the same queue always gives the same board.
  Arrows may cross; they never start or end on the wrong counter.
- **B15.** If the queue has `problems` (cycles, broken records), they are
  listed under the board.
- **B16.** The shipped list shows every shipped intent: `§<id>`, title and
  type, newest first.

### The reader

- **B17.** Clicking or pressing Enter/Space on a counter or a shipped row
  opens that intent in the reader: title `§<id> <title>`, a line with type,
  status, gates, auto and the ref read from, the `blocked_by` list with
  each reason and whether it is still open, and tabs Intent, Spec, Plan,
  Review, KonMari. A tab whose document is missing is disabled.
- **B18.** The selected document is rendered from Markdown (GitHub-flavoured:
  tables, fenced code), then sanitised: no `<script>`, no event-handler
  attributes, no `javascript:` URLs survive. Links open as plain links.
- **B19.** A picker lists every intent grouped as the queue groups them
  (in flight, queued, shipped, stopped, other) and opens the chosen one.
- **B20.** Opening a document sets the URL hash to `#i-<id>-<doc>`
  (`replaceState`). Loading the page or changing the hash to `#i-<id>` or
  `#i-<id>-<doc>` opens that intent and document; an unknown doc name falls
  back to the first existing one, an unknown id shows "No intent §<id> in
  this repo". `<doc>` is one of `intent`, `spec`, `plan`, `review`,
  `konmari`.
- **B21.** The selected counter or shipped row is highlighted. Tabs are
  reachable by keyboard and switch with Left/Right arrows.

### Look and offline

- **B22.** The page follows the system's light or dark preference, with
  the artifact's palette (status colours, red for hard blockers) and system
  font stacks. Every script, style and font it loads is served by the local
  server; it makes no request to any other host.

### Stack and the §1 obligations

- **B23.** The stack: Node ≥ 22, a server on `node:http` with no web
  framework, a front end of plain HTML, CSS and ES modules served as files
  with no build step, tests on `node:test`. Markdown rendering and
  sanitising use pinned npm packages served from the local install (the
  plan names them and why).
- **B24.** The code is split into:
  - `src/core/`: pure logic, no I/O, importable by both server and
    browser: board layout (queue JSON → columns, counters, arrows), hash
    parsing, ref and folder choice for a document;
  - `src/server/`: I/O: HTTP, git, running `queue.mjs`, static files;
  - `src/web/`: the page (HTML, CSS, browser JS);
  - `bin/intent-map.mjs`: the entry point.
  
  `src/core/` imports nothing from `src/server/`, `src/web/` or `node:`
  modules; `src/web/` imports nothing from `src/server/`. A test fails
  when either rule is broken.
- **B25.** `npm run verify` stays one command and runs, in order: lint,
  the kit's tests, the product's tests. There is no build step to run.
- **B26.** The §1 bookkeeping lands in the same change: `CLAUDE.md` →
  "Architecture" describes B24's modules; `docs/architecture.md` fills in
  principles 1 and 2 with B24's rules and how they are enforced;
  `CORE_CODE` is narrowed to `src/core/`; `BUDGETED` covers `src/`, `bin/`
  and `scripts/` and excludes `node_modules/` and any vendored file; the
  size baseline is rewritten; `REVIEW-POLICY.md` names `bin/**`,
  `src/server/**` and `src/web/**` as live-check paths and states that no
  path matches the "by meaning" list yet; `npm run setup:worktree` is
  `npm ci`.

## Interpretations

- **I1. "One source of truth for the queue"** (intent, Constraints) is read
  as *run the target repo's own `scripts/queue.mjs --json`*, not this
  repo's `queue-lib.mjs`. The map then always agrees with that repo's
  `npm run queue`, whatever kit version it has. The cost: the server runs
  code from the target repo. That is accepted because the target is the
  owner's own repo, which they already run `npm run queue` in. (Code
  comment at the queue runner.)
- **I2. "Read-only on the repo it shows"** includes running `queue.mjs`,
  which only reads git (`ls-tree`, `show`, `log`, `for-each-ref`,
  `merge-base`). The map does not audit that script; B9 limits what the
  server itself runs.
- **I3. "Read from the same ref the queue used"** (intent, Outcome): the
  queue's JSON says `source: branch | main | branch conflict` but not the
  branch name, so the server finds the branch by the same rule as
  `readIntentMetadataFromBranch`. On `branch conflict`, documents come from
  `main`, as the queue's status does.
- **I4. "Recently shipped"** in the artifact held 5 counters; the spec
  keeps 5 and lists all shipped intents below, as the artifact did.
- **I5. Arrows: "every `blocked_by` shows as an arrow"** (intent, Outcome)
  is narrowed to *open, direct* blockers, as the artifact draws only "hard
  `blocked_by`: the target builds only after the source merges". A blocker
  already merged waits for nothing, and would clutter the board; it is
  still listed in the reader (B17).
- **I6. "Without overlaps"** (intent, open question on arrow routing) is
  relaxed to B14: deterministic and correct endpoints, crossings allowed.
  Overlap-free routing is a later intent if the board gets busy.

## Acceptance criteria

Fixture repos are built by the tests in a temp directory: `git init`, this
repo's kit `scripts/` copied in, intents committed on `main` and on
`feat/<id>-…` branches.

- **AC1** (B1–B3): the server starts on a fixture repo and answers `/`;
  it exits non-zero with the reason for a non-git directory, a repo without
  `scripts/queue.mjs`, and a taken port. *Test:* `src/server/cli.test.mjs`.
- **AC2** (B2): the server listens on `127.0.0.1` only. *Test:* same file,
  asserting the bound address.
- **AC3** (B5): `/api/queue` returns the same groups and intents as
  `node scripts/queue.mjs --json` run in the fixture, plus `repo`, `main`
  and `at`; after a new intent is committed in the fixture, the next request
  includes it. *Test:* `src/server/api.test.mjs`.
- **AC4** (B6): a fixture whose `queue.mjs` exits 1, and one that prints
  non-JSON, give an error response carrying the message. *Test:*
  `api.test.mjs`.
- **AC5** (B7, B8, I3): an intent whose branch is unmerged returns the
  branch's `spec.md`, not `main`'s; a merged intent returns `main`'s;
  a missing document is `null`; an id not in the queue is 404; `/api/intent/
  ..%2F..` and other non-numeric ids are 404. *Test:* `api.test.mjs`.
- **AC6** (B9): after the whole API suite runs against a fixture, its
  `git status --porcelain` is empty and its refs are unchanged. *Test:*
  `api.test.mjs`.
- **AC7** (B11, B12, B14, I4): given queue JSON fixtures, the layout puts
  each status in its column, keeps only 5 shipped, omits stopped, shows the
  Other column only when needed, and builds the state line; the same input
  gives the same output. *Test:* `src/core/layout.test.mjs`.
- **AC8** (B13, I5): arrows are produced exactly for direct open blockers
  with both ends on the board, from source to target, with the reason; an
  off-board open blocker lands in the tooltip. *Test:* `layout.test.mjs`.
- **AC9** (B20): `#i-87`, `#i-87-review`, `#i-87-bogus` and `#x` parse as
  specified. *Test:* `src/core/hash.test.mjs`.
- **AC10** (B18): Markdown containing `<script>`, `<img onerror>`, and a
  `javascript:` link renders without any of them. *Test:*
  `src/web/render.test.mjs` (or wherever the plan puts rendering), run in
  Node against the same sanitiser configuration the page uses.
- **AC11** (B22): every URL in the served HTML, CSS and JS is relative or
  same-origin. *Test:* a scan of `src/web/` in `src/server/static.test.mjs`.
- **AC12** (B24): an architecture test fails when a file in `src/core/`
  imports from `src/server/`, `src/web/` or `node:`, or a file in `src/web/`
  imports from `src/server/`; it passes on the real tree. *Test:*
  `src/architecture.test.mjs`, proven to fire on a planted bad import.
- **AC13** (B25, B26): `npm run verify` passes on a fresh clone after
  `npm run setup:worktree`, and the bookkeeping files say what B26 says.
  *Check:* the reviewer runs both and reads the diff.
- **AC14** (B10–B22, live): the owner runs `npm start --
  C:/Users/eric/src/heraklios`, opens the page and sees Héraklios's open
  intents in the right columns with its blocker arrows; opens a counter, a
  shipped row and a `#i-<id>-review` link; switches tabs; sees the same in
  dark mode; reloads after a change to a `metadata.yml` and sees it; and,
  with the network off, sees the page whole. Then the same against this
  repo. *Live check* (owed: the diff touches `bin/`, `src/server/`,
  `src/web/`).

## Non-functional

- **Boundaries:** B24. Layout, hash parsing and document-ref choice live in
  `src/core/` (pure, unit-tested); `src/server/` only wires git and HTTP to
  them; `src/web/` only presents.
- **Data:** none stored. The server keeps nothing between requests and
  writes no file; the page keeps nothing in `localStorage`. The intents it
  shows may hold whatever the owner wrote; they leave the machine only to
  the owner's own browser on `127.0.0.1`.
- **Model use:** none. No model call, no prompt.
- **Autonomy:** the app takes no action on the repo. It cannot record a
  gate, change a status, run a skill or start a session.
- **Security:** bound to `127.0.0.1` (B2); requests whose `Host` header is
  not `localhost:<port>` or `127.0.0.1:<port>` are refused (against DNS
  rebinding from a web page); git is run with an argument array, never a
  shell string; ids are numeric and docs from a fixed list (B8, B20).
- **Performance:** on Héraklios (~60 intents) `/api/queue` answers within
  the time `npm run queue` takes there plus 0.5 s, and `/api/intent/<id>`
  within the time one `node scripts/queue.mjs --json` run takes there plus
  0.5 s, since it checks the id against the current queue (B8) with no
  cache (B5). A page load that opens an intent from its hash may run the
  queue twice. Faster document opening is a later intent. *(Amended
  2026-11-25 on review round 1, HIGH-1: the owner chose option (c),
  "relax the spec's performance line"; the earlier line said "a document
  opens within 0.5 s".)*

## Out of scope

As the intent: editing intents or recording gates, the "Refresh via
Claude" button, watching for changes (reload instead), session state from
`npm run sessions`, the "Order of march" prose, a desktop app, several repos
in one view. Also: choosing the repo from the page, overlap-free arrow
routing (I6), soft `links:` as lines on the board, mobile layout beyond
horizontal scrolling of the board, a browser end-to-end suite (AC14's live
check covers the page for §1).

## Assumptions I made

- **Stack (open question 1):** Node `node:http` + plain ES modules, no
  build, no framework (B23). Reason: the kit already needs only Node, so
  `verify` stays one command with nothing to build, and the page is small.
- **Queue source (open question 2):** the target repo's own `queue.mjs`
  (I1). A repo without it is refused (B3) rather than falling back.
- **Board layout (open question 3):** B11–B14, I4–I6.
- **Repo choice (open question 4):** CLI argument only (B4). A page field
  would let any page on `localhost` ask the server to read any path.
- **Reader contents (open question 5):** the four documents plus
  `konmari.md`, with gates and `blocked_by` in the header (B17).
  `metadata.yml` itself is not shown raw.
- **Visual design (open question 6):** the artifact's palette with system
  fonts (B22); bundling Cormorant/IBM Plex is left out to keep dependencies
  down.
- **Port (open question 7):** 5300 by default, `--port` to change (B1).
- **Lint:** `verify` gains a lint step (B25); which linter, and its rules,
  is the plan's choice, justified there as a dependency.
- **Documents come from git, never the working tree** (B7), so an
  uncommitted edit does not show until committed. This matches the queue,
  which also reads committed metadata.
- **Reload-to-refresh** suffices; no polling.
