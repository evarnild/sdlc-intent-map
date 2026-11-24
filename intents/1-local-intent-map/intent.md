<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §1 — Stack, skeleton and a first local intent map

**Type:** feature
**Originator:** me (the owner)
**Source:** the Héraklios Intent Map artifact,
https://claude.ai/artifact/ViTJPDrdtofdjC2MrZSPeZ (read 2026-11-24, version
1795554505-b4a0); `OVERVIEW.md` → "Next"

## Problem

I follow my SDLC-kit projects (Héraklios first) through an intent map that
lives as a Claude artifact. It shows every open intent as a counter on a
board, in columns "RECENTLY SHIPPED · BUILD · REVIEW · PLANNED · WAITING ·
DRAFTS", draws each hard `blocked_by` as a red arrow, lists the shipped
intents, and has a reader with Intent / Spec / Plan / Review tabs for any
intent (deep links such as `#i-87-intent`).

What is wrong with it:

- **It is a snapshot, rebuilt by hand.** Its header reads "all intents · 24
  Nov 2026, evening · main at 95a3f34 · from npm run queue, metadata.yml
  blocked_by and links". The only way to update it is its "↻ Refresh map"
  button, which "asks Claude, in the session that is watching this page, to
  rebuild the map from the queue and republish it". With no session
  watching, it says "No Claude session is watching this page right now."
- **The board layout and the "Order of march" are written by Claude** each
  time (counter coordinates in the SVG, prose such as "§73 is built and in
  review round 1 … It unblocks §84"), so they can drift from the repo.
- **Live documents need the desktop app with full access.** In a plain
  browser the reader shows a "bundled copy"; reading the repo directly
  takes "Install as desktop app for live documents" and a `full-access`
  grant to run `node scripts/queue.mjs --json` and `git show`.
- **It is tied to one repo:** `DEFAULT_REPO = 'C:/Users/eric/src/heraklios'`
  and the title "Héraklios Intent Map".

There is also no product code in this repository yet. `OVERVIEW.md` → "Next"
says the first intent must "choose the stack and build the project
skeleton. Extend `npm run verify` with build, lint and test. Write
`CLAUDE.md` → "Architecture". Narrow `CORE_CODE`. Name the live-check and
Reviewed-tier paths. Define `npm run setup:worktree` if a fresh worktree
needs dependencies."

## Outcome

- One command run on this PC (for example `npm start -- <repo path>`)
  serves the intent map on `localhost`. Opening it in a browser shows the
  current state of any SDLC-kit repository given to it (Héraklios and this
  repo both work), with no Claude session, no artifact and no network
  access needed.
- The map is derived from the repo, never hand-drawn: every intent from the
  queue (`metadata.yml` read from the intent's branch while unmerged, else
  `main`, as `npm run queue` does) appears in the column its status puts it
  in, every `blocked_by` shows as an arrow from source to target, and the
  shipped intents are listed. Reloading the page after a change in the repo
  (a new intent, a gate recorded, a merge) shows that change.
- Clicking an intent opens a reader with its intent, spec, plan and review,
  read from the same ref the queue used and rendered from Markdown. A URL
  of the form `#i-<id>-<doc>` opens that intent and document directly.
- The stack is chosen and recorded, and the §1 obligations in `CLAUDE.md`
  are done: `npm run verify` builds, lints and tests the product as one
  command; `CLAUDE.md` → "Architecture" is written; `CORE_CODE`,
  `BUDGETED`/`BUDGET_EXCLUDE` and the size baseline are narrowed; the
  live-check and Reviewed-tier paths are named; `npm run setup:worktree`
  exists if a worktree needs dependencies.

## Constraints

- **Read-only on the repo it shows.** The app never writes to the target
  repository, never records a gate, and runs no git command that changes
  state (no checkout, fetch, merge). It reads files and runs read-only git
  (`git show`, `git branch`, `git log`).
- **Local only.** It listens on `localhost` only, sends nothing to any
  external system, and works offline: no fonts, scripts or styles from a
  CDN at runtime (the artifact loads Google Fonts, marked and DOMPurify from
  CDNs). No accounts, no telemetry, no model calls.
- **Untrusted Markdown.** Intent documents are rendered as HTML only after
  sanitising; a document cannot run script in the page.
- **One source of truth for the queue.** The map uses the queue's rules, so
  it cannot disagree with `npm run queue` on status or grouping.
- **Tests never touch a real repo.** Fixture repositories built in a temp
  dir by the test stand in; no Héraklios content or real user data is
  committed as a fixture.
- **Dependencies:** each new one is justified in `plan.md` (`CLAUDE.md` →
  "Conventions that already apply"). The kit's own scripts keep needing
  only Node ≥ 22.
- **Out of scope for §1:** editing intents or recording gates from the UI,
  the "Refresh via Claude" button, live push/watch updates (a reload is
  enough), session state from `npm run sessions`, a written "order of
  march", packaging as a desktop app, several repos in one view.

## Type-specific questions

### Feature
- **Users:** the owner, on their own PC, following one or more SDLC-kit
  repos; secondarily the coordinator session, which can point the owner to
  `localhost:<port>/#i-<id>-review` instead of republishing an artifact.
- **What exists today:** the Claude artifact above (a static SVG board and
  a reader showing a bundled copy, live only in the desktop app with full
  access), and `npm run queue` in the terminal. Nothing in this repo.
- **Open design questions:**
  - The stack: a Node-only server with a vanilla front end, or a framework
    (for example Vite and a UI library)? Which keeps `verify` one command
    and `setup:worktree` cheap?
  - How the app gets the queue: run the target repo's own
    `scripts/queue.mjs --json` (follows that repo's kit version, but runs
    its code), or this repo's `queue-lib.mjs` (one version, which may
    disagree with an older kit)?
  - Board layout: which statuses go in which column (the artifact uses
    recently shipped / build·review / planned·waiting / drafts), how many
    shipped intents appear on the board versus the list, and how arrows are
    routed automatically without overlaps.
  - How the repo is chosen: a CLI argument only, or also a field in the
    page (remembered)?
  - What the reader shows besides the four documents: gates, `blocked_by`,
    links, `konmari.md`, `metadata.yml`?
  - The visual design: keep the artifact's look (campaign-map palette,
    light and dark) with fonts bundled locally, or start plain?
  - Port: a fixed default for the main checkout, alongside spawn's
    `5200 + (id mod 100)` for worktrees.

## Assumptions I made

- §1 covers both the stack and skeleton **and** the first working map
  (owner's choice in the question round: "Stack + first slice").
- "Runs standalone" means a local web server opened in a browser (owner's
  answer), not a single HTML file or a desktop app.
- The data is read from a repo (owner's answer). The artifact's bundled
  `docs/*.json` copy is not needed, since the server can always read live.
- The map must work for any SDLC-kit repo, not only Héraklios; the
  Héraklios title and default path go.
- Reload-to-refresh is enough for §1; file watching is a later intent.
- The "Order of march" prose and the "Refresh via Claude" button are left
  out: both need a model, and this app makes no model calls.
- `review_tier` is left to the path table: the app reads local files and
  sends nothing to a user or an external system without a human in
  between, so nothing on `REVIEW-POLICY.md`'s "by meaning" list applies.
  Rendering untrusted Markdown is covered by the sanitising constraint.
- No `blocked_by`: this is the first intent.
