<!-- generated-by: sdlc-intent-map/intent@0.3.0 -->
# §2 — /deliver and sdlc.md say the main checkout needs its dependencies installed

**Type:** adjustment
**Originator:** me (the owner), after §1's delivery
**Source:** `intents/1-local-intent-map` (the §1 ship, 2026-11-25)

## Problem

When §1 shipped, `npm run deliver -- 1` merged `feat/1-local-intent-map` into
`main` and then stopped: "`npm run verify` failed on main AFTER the merge …
`eslint` is either misspelled or could not be found". The main checkout had
no `node_modules`, because §1 is the first intent to add dependencies and
only spawned worktrees run `npm run setup:worktree`. The merge was already
done, so the owner had to install by hand and re-run `/deliver 1`.

Nothing in `sdlc.md` ("Merging goes in this order: … 2. `npm run verify` on
`main`") or in `.claude/skills/deliver/SKILL.md` says that `main` needs its
dependencies first.

## Outcome

- `sdlc.md`'s merge order and the deliver skill's "Run it" list each say that,
  once the project has dependencies, `npm run setup:worktree` is run in the
  main checkout before `/deliver` (a dry-run does not catch it).
- No script, test or behaviour changes.

## Constraints

- Wording only: at most 5 files and 60 lines, no core code (`CORE_CODE` is
  `src/core/`).
- `.claude/skills/**` is on `REVIEW-POLICY.md`'s Reviewed-tier path table, so
  the path table makes this change Reviewed; `review_tier` is left empty.
- Out of scope: making `deliver.mjs` install dependencies or check for them
  before merging. That changes the kit's enforcement code (Reviewed tier, with
  tests) and is a separate feature or fix if wanted.

## Type-specific questions

### Adjustment
- **Exactly what changes:** one added sentence (or short list item) in
  `sdlc.md` under "Merging goes in this order", before step 1 or at step 2;
  one added sentence in `.claude/skills/deliver/SKILL.md` → "Run it", as a
  step before "Run:". Both say: in the main checkout, run
  `npm run setup:worktree` first when `node_modules` is missing, or after a
  merge that adds dependencies; otherwise `verify` fails after the merge.
- **Blast radius:** 2 files, about 6 lines, no core code.

## Assumptions I made

- The owner's "the deliver or sdlc.md problem" means both texts should say it;
  the wording fix is the smaller one, and a check inside `deliver.mjs` is left
  for a later intent.
- `npm run setup:worktree` is the right name for the install in the main
  checkout too (it is `npm ci`, defined by §1).
- The `.claude/skills/deliver/SKILL.md` edit makes the tier Reviewed, so the
  owner reads the diff.
