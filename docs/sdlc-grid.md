<!-- generated-by: sdlc-intent-map/grid@0.2.0 -->
# sdlc-intent-map — AI-native SDLC grid

One area: the whole repository. Owner: Eric Varnild. Refresh with `/grid` at
the start of each quarter or after a pilot change. The numbers come from
`npm run sdlc:scan`, not from memory.

Model and levels: six stages (Intent, Design, Build, Test, Deploy,
Maintain) and five levels (L0–L4). Each stage ends in an artefact the next
one reads, with humans at the gates. The kit was first built for
heraklios (github.com/evarnild/heraklios), whose `docs/sdlc-grid.md` is a worked
example.

## The grid — 2026-11-25 (after §1 and §2 shipped)

| Stage | Level | Evidence | Gap to next level |
| --- | --- | --- | --- |
| **Intent** | L2 (feature, adjustment) | §1 and §2 were drafted by `/intent` and carry its stamp (scan: 2 intents, 2 skill-stamped); both passed `intent_accepted`. Only two intents so far, and no fix, refactor or experiment | L3: a user report or a monitor drafts the intent itself (nothing does) |
| **Design** | L2 (feature) | §1's `spec.md` was made by `/spec` (scan: 1 by `/spec`, 0 hand) and accepted at `spec_accepted`; §1's plan was made by `/build-plan` (1 of 1). One feature is the whole sample | L3: accepting an intent fires the spec pass (it is still a typed command) |
| **Build** | L1 | `CLAUDE.md` with the module map; plans approved before code (enforced by `check:intent`); versioned implementer, reviewer and KonMari agents (Claude + Codex); `/build-plan`, `/spawn` + `/sessions`, `/auto` carried §1 from plan to "ready" in two rounds. The shared skills and agents of L2 exist; the hooks that block unsafe actions do not (the hooks in `.claude/settings.json` only log session events) | L2: hooks that block unsafe actions (push, `git checkout` in the main checkout) |
| **Test** | L1, with one hole | `npm run verify` runs lint, the kit's tests (376) and the product's tests (95); the review mutation-tested §1 (103 mutants in round 1, 38 in round 2). The page itself (`src/web/app.mjs`, `style.css`) has no automated test, so its behaviour rests on the owner's live check. `verify` has no dependency or secret check | L1 complete: a dependency and secret check beside `verify`, and an automated test for the page. Then L2 |
| **Deploy** | L1 | Written `REVIEW-POLICY.md` with tiers; `/review` and the reviewer agent ran on 2 of 2 merged intents and left a stamped `review.md` each time; `/deliver` checks the merge preconditions as tested code and stopped correctly on an uncommitted `review.md`. Both intents were Reviewed tier, so no change has been attested yet | L2: tiers applied automatically from the policy, and gates enforced as hooks rather than in a script run by hand |
| **Maintain** | L0 | Nothing runs, so there is nothing to observe. The product is a tool the owner starts by hand; no scheduled check, no soak run | L1: findings written as fix intents (none to write yet: no follow-up fix or revert so far) |

**Production release stays human by design**: any deployment and any push
stay manual gates at every level.

**Declared choices** (the scan can't see these, so keep them on refresh):
- Merges are local. The review report is a committed `review.md`, not a PR
  comment. `main` was pushed to github.com/evarnild/sdlc-intent-map on the
  owner's request (2026-11-25); that push is a manual gate.
- The stack is §1's decision, made: Node ≥ 22, `node:http`, plain ES modules
  with no build step and no framework, `marked` and `dompurify` served
  locally, tests on `node:test`, lint with eslint. The kit's scripts still
  need only Node.
- The owner records no gate by their own hand so far: all of `intent_accepted`,
  `spec_accepted`, `plan_approved` and `live_checked` were recorded by an
  agent on the owner's words in the conversation (`by-agent`). That is the
  rule working as written, and not a bypass.

## The two we move — Q4 2026

1. **Test → finish L1 (climb).** Two holes, both visible in §1's review: the
   page has no automated test (the live check was its only proof), and
   `verify` has no dependency or secret check. First step: draft a `/intent`
   for a page test that runs without a browser (or with the installed Edge,
   headless), and a separate `npm run check:security` (kept out of `verify`,
   which must not need the network).
2. **Deploy → L2 (climb).** Review pass 4 is the expensive one and it failed
   twice for the same reason: §1's two review rounds each ran into the
   machine's memory limit while the mutation batch was running (round 2's
   reviewer was stopped partway). The coordinator finished the run by hand
   with the reviewer's own script. First step: turn that script into a
   committed kit command (for example `npm run mutate`) that runs one mutant
   at a time, restores by copy and writes its result lines, so pass 4 is a
   command and not a prompt.

## Measures

Report progress and outcome together, never one without the other. Never
read throughput without the revert rate beside it.

| Date | Window | Changes on main | Per week | Reference an intent/§ | Reverts | Intents (stamped) | Attested / reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-24 | repo start | 1 (the kit scaffold) | — | — | 0 | 0 (0) | — |
| 2026-11-25 | 2026-11-24 → 2026-11-25 | 10 | 10 (a two-day window: not a rate) | 80% (8 of 10; the scaffold and the GitHub `LICENSE` merge name no intent) | 0 (0.0%) | 2 (2) | 0 attested / 2 reviewed (§1 escalate, round 2, auto; §2 escalate, round 1, manual); 0 follow-up fixes, 0 reverts |

## What each level means here

| Stage | L1 · by hand | L2 · codified | L3 · triggered | L4 · closed loop |
| --- | --- | --- | --- | --- |
| Intent | `intents/<id>/intent.md` written with an assistant, type declared, accepted in metadata | `/intent` drafted and validated it (stamp) | a user report or a monitor drafts the intent itself | intents drafted, deduplicated and ranked unattended |
| Design | `spec.md` written by hand for features | a `/spec` skill loads conventions and prior decisions | accepting an intent fires the spec pass | specs produced unattended; only flagged concerns reach you |
| Build | context file; plan approved before code | shared skills and agents for plan, implement, verify; hooks block unsafe actions | an accepted spec fires plan generation | approved plans implemented unattended where the checks carry it |
| Test | `npm run verify` with a fresh context; failing test first for fixes; security check | test files protected during fixes; a verification skill; an eval suite where the product uses a model | a new change fires verification automatically | verification repairs its own failures within limits |
| Deploy | written review policy; agentic review on every change | tiers applied automatically from the policy; gates enforced as hooks | a verified change fires review; you act on the report | everything up to the release gate unattended (ceiling) |
| Maintain | findings written as fix intents | scheduled evals or soak runs; deterministic checks | a failure fires diagnosis; you triage | findings written back as intents unattended |

Don't skip L1, and don't automate a stage past the point where its output
can be checked.

## Changelog

- 2026-11-24: first fill, alongside the kit scaffold.
- 2026-11-25: after §1 (the stack, skeleton and the first intent map) and §2
  (a wording fix to `/deliver` and `sdlc.md`) shipped. Intent L1 → L2, Design
  L0 → L2, Test L0 → L1 (with two holes), Build and Deploy unchanged at L1,
  Maintain L0. The stack is no longer undecided.
