<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §4 — The page has an automated test, and a security check sits beside verify

**Type:** feature
**Originator:** me (the owner), from `docs/sdlc-grid.md` (2026-11-25), move 1
**Source:** `intents/1-local-intent-map/review.md` (round 2, "Not checked"),
`docs/sdlc-grid.md` → "The two we move", move 1 (Test → finish L1)

## Problem

Two holes keep the Test stage from a clean L1:

1. **The page has no automated test.** §1's round 2 `review.md` says under
   "Not checked": "The page itself (`src/web/app.mjs`, `style.css`): no
   automated test, not rendered this round. The live check covers it." Round 1
   named the same rules: "B10, B12 colours, B13 hover and focus, B17, B19, B21
   keyboard tabs, B22 dark mode and offline." Only the pure logic in
   `src/core/` and the Markdown sanitiser (`src/web/render.mjs`, under jsdom)
   are tested. `src/web/app.mjs` (216 lines: drawing the board, the reader,
   the picker, keyboard tabs, the hash) is proven only by the owner running
   it. A change to it passes `npm run verify` whatever it does, and a
   mutation of it (for example the `pickDoc(body.documents, doc)` call at
   `app.mjs:192`) is caught only by lint, not by a test.
2. **There is no dependency or secret check.** `docs/sdlc-grid.md` scores Test
   L1 "with one hole": "`verify` has no dependency or secret check". The grid's
   cheat sheet lists a "security check" as part of Test L1. The only secret
   scan on this repository was one run by hand before the repository went
   public on 2026-11-25. Dependencies are pinned (`marked`, `dompurify`,
   `jsdom`, `eslint`, `@eslint/js`, `globals`) with 110 lockfile entries, and
   nothing re-checks them against known advisories.

## Outcome

- A test that loads the real page (`src/web/index.html` and `app.mjs`) against
  a fake queue and fake documents, with no browser and no network, and proves
  the behaviours the live check showed by eye: the board draws the columns and
  arrows the layout returns; a counter, a shipped row and the picker each open
  the reader; tabs for missing documents are disabled and Left/Right move
  between the others; the hash opens an intent and document, and a bad hash
  falls back; an API error shows its message in place of the map. It runs in
  `npm run verify`.
- The page test fails when a changed line of `app.mjs` changes one of those
  behaviours (shown by mutating it).
- `npm run check:security` (name open) reports known advisories in the pinned
  dependencies and any secret-like string in tracked files, exits non-zero on
  a finding, and is **not** part of `npm run verify`, which must keep running
  offline.
- `docs/sdlc-grid.md`'s Test row can say L1 without a hole.

## Constraints

- **Offline `verify`.** The page test makes no network call; the security
  check, which does, stays outside `verify`.
- **No real data.** Fixtures are made-up queue JSON and documents. A secret
  scan must not print the secret it finds; its output names the file and the
  line only, and the check never commits or sends anything.
- **Dependencies:** each new one is justified in `plan.md`
  (`CLAUDE.md` → "Conventions that already apply"). `jsdom` is already a dev
  dependency (31.0.1) and is the first candidate for the page test.
  `npm audit` needs the registry; no other service is called.
- **The target repo stays read-only** and the server is unchanged: this adds
  tests and a check, not behaviour. If the page needs a small change to be
  testable (for example exporting a function), that is allowed, kept to the
  fewest lines, and covered by the live check.
- **Tier:** `src/web/**` and tests do not raise the tier, but a new script in
  `scripts/` and any edit to `package.json` scripts that changes `verify`
  follow the path table; `review_tier` is left to it.
- **Out of scope:** a real-browser end-to-end suite, visual regression, CSS and
  dark-mode appearance (the live check keeps those), and automatic dependency
  updates.

## Type-specific questions

### Feature
- **Users:** the owner and the reviewer (a page change now has a test to fail),
  and any session running `npm run verify`.
- **What exists today:** `src/web/render.test.mjs` (the sanitiser, under
  jsdom), `src/server/static.test.mjs` (every URL in `src/web` and `src/core`
  is relative, and `/vendor/*` is served), `src/architecture.test.mjs`
  (imports), and nothing for `app.mjs`. No dependency check; one manual secret
  scan.
- **Open design questions:**
  - **How to run the page.** jsdom with the page's real ES modules (does jsdom
    run `<script type="module">` and `import` from `/core/...`, or must the
    test load modules itself and hand them a DOM)? Or the installed Edge
    headless, which would test the real thing but needs a browser on every
    machine that runs `verify`? Which keeps `verify` one command?
  - **What `app.mjs` must expose.** It calls `load()` at import and draws into
    fixed element ids; does it need a factory (for example
    `createApp({ document, fetch, history, location })`) so a test can inject a
    DOM and a fake `fetch`? How small can that change be?
  - **SVG.** jsdom has no layout, so counter sizes and arrows are not
    measured; is "the SVG has these nodes with these attributes" the right
    claim for the board?
  - **The security check.** `npm audit --omit=dev` alone, or including dev
    dependencies (eslint and jsdom run only in tests)? Which secret scanner:
    a committed pattern list in the kit (no new dependency), or an external
    tool? What counts as a finding on the existing dummy strings such as
    `sk-SECRET-123` in `scripts/session-lib.test.mjs`?
  - **Where `check:security` runs.** By hand, in `/review` pass 8 (which
    already says "No secret, token or user data is committed"), or in
    `/deliver` before a push to the public remote?

## Assumptions I made

- The owner's "go" means: draft it now, with the questions above left to the
  spec rather than asked.
- Move 1 of the grid was written as one move with two parts. They share a
  Test-stage goal but could ship separately; this intent keeps them together
  because both finish Test L1. If the spec finds the page test large, split
  the security check into its own intent.
- "No browser" is a preference, not a rule: the owner has Edge installed (the
  §1 implementer looked at the page in it), but `verify` running with no
  browser keeps it fast and portable.
- Mobile layout, appearance and keyboard focus rings stay with the live check.
- No `blocked_by`. It relates to §3: once `npm run mutate` exists, the page
  test's strength can be shown with it; recorded under links only.
