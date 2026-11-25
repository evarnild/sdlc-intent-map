<!-- generated-by: sdlc-intent-map/review@0.3.0 -->
# §2 review — /deliver and sdlc.md say the main checkout needs its dependencies installed

verdict: escalate
tier: reviewed
reviewed-commit: d1934c2161a41f1b82b0bd00e2256f95613a256d
round: 1
sampled: no
run: manual
live-check: not-needed

Tier: **Reviewed**, set by the path table: the diff edits
`.claude/skills/deliver/SKILL.md` (`.claude/skills/**`, `REVIEW-POLICY.md:30`).
`metadata.yml` leaves `review_tier` empty, and no finding changes it. No
finding needs rework or a decision, so the verdict is `escalate`: the owner
reads the diff.

## Passes

| # | Pass | Result |
| --- | --- | --- |
| 1 | Intent and plan match | pass: the two edits are the two the intent names (`sdlc.md`, `deliver/SKILL.md`), 13 lines in all; the intent said "one added sentence" in each and each is a short paragraph, within the 5-file, 60-line blast radius. The `metadata.yml` change is `status: in-review` only. An adjustment has no plan |
| 2 | Type check | pass (PASS) |
| 3 | Behaviour against the spec | pass: an adjustment has no spec; the intent's outcome (both texts say to run `npm run setup:worktree` in the main checkout first) is met, and nothing else changed |
| 4 | Tests prove the behaviour | not applicable: the diff has no behavioural line (two Markdown files and a status field), so there is no mutant to make |
| 5 | Conventions (CLAUDE.md) | pass: no code, no model call, no secret |
| 6 | Numbers in prose | pass: the added text states no measurement |
| 7 | Documentation | pass, with a note (LOW-1): the two additions are the documentation. `CLAUDE.md` is unaffected |
| 8 | Guardrails and hygiene | pass: `verify` green with lint clean, no dependency added, no secret, nothing reaches a shell or HTML |
| 9 | Repository footguns | pass (the list is empty) |
| 10 | Architecture | pass: no module touched; `docs/architecture.md` does not apply |

## Type check

```
> sdlc-intent-map@0.0.0 check:intent
> node scripts/check-intent.mjs

type-check: PASS (intent 2, adjustment)
  note:  2 file(s), 13 line(s) changed outside intents/.
```

`npm run verify` (worktree, HEAD d1934c2): exit 0; lint clean; `test:kit`
376 pass, 0 fail; `test:app` 95 pass, 0 fail.

## Findings

- **LOW-1** `sdlc.md:112` — the new paragraph's first sentence is hard to read: "Step 2 runs in the main checkout, which only a spawned worktree gets dependencies installed in." It says the right thing (only spawned worktrees get `npm run setup:worktree`, the main checkout does not), but a reader can parse it the other way. Worth a look: for example "Step 2 runs in the main checkout, and only spawned worktrees get their dependencies installed (`npm run setup:worktree`)."

No finding needs rework or a decision.

The added claims were each checked against the code:
- "Only spawned worktrees get `npm run setup:worktree`": `scripts/spawn-intent.mjs:74,82-85` runs it for a new worktree; nothing in `scripts/deliver.mjs` does.
- "`verify` fails after the merge is already done": `scripts/deliver.mjs:409` runs `npm run verify` as a step after the merge; this is what happened when §1 shipped.
- "A `--dry-run` does not catch it": the §1 dry-run listed `would verify` and did not run it.
- "Ask the owner whether to run `npm run setup:worktree`": consistent with `REVIEW-POLICY.md` → "Merging", which lets an agent merge, push or remove only on the owner's request; the skill asks and does not install on its own.

## Not checked

- **Wording on a real run.** Whether a future coordinator reads the added step as intended rests on reading only; nothing exercises a skill's text.
- **`deliver.mjs` itself:** this change adds no check or install to the script (out of scope in the intent), so a `/deliver` on a main checkout with no `node_modules` still merges first and fails `verify` after. The paragraphs warn about it; they don't prevent it.
- **The `.claude/skills/deliver/SKILL.md` instruction in a session:** skills are not machine-checked.
- **Platforms:** Windows only.

## Live check

not needed — no runtime path (`bin/**`, `src/server/**`, `src/web/**`) is touched, `.claude/settings.json` is not touched, and no Not-checked item is runtime behaviour that only a live run can show.

## Verified myself vs. taken on trust

Verified myself (worktree `C:/Users/eric/src/sdlc-intent-map-wt/2-deliver-needs-installed-main`, branch `adjust/2-deliver-needs-installed-main`, HEAD d1934c2):
- `git diff main...HEAD` read in full: 2 content files (+12/-1) and the status field.
- `npm run verify`: exit 0 (lint clean, 376 and 95 pass). `npm run check:intent`: PASS.
- `npm run sdlc:scan -- --sample-due manual --exclude 2`: "nth attested manual change = 1, every 5, sampled: no".
- The four claims above, against `scripts/spawn-intent.mjs` and `scripts/deliver.mjs`.
- `main` is at 0a48ba5; there is no remote, so nothing was merged or pushed.
- No mutation testing: there is no behavioural line.

Taken on trust:
- That the §1 dry-run output (`would verify`) is representative of every dry-run.
