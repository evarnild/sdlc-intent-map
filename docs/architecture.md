# Architecture principles

This file is the only place a principle's wording lives. Review pass 10
(`REVIEW-POLICY.md`) and the KonMari brief point here and don't restate it.
A new layer, boundary or exception is added here, with its reason, in the
change that needs it (principle 12).

Each principle says how it is checked:

- **Enforced**: a lint rule, a test or a check fails `npm run verify` or
  `npm run check:intent`.
- **Judged**: review pass 10 reads the plan's "Where this goes" section and
  the diff against it.

The stack is Node ≥ 22 with `node:http`, plain ES modules in the browser, no
build step and `node:test` (§1). The layers are `src/core/` (pure logic),
`src/server/` (I/O), `src/web/` (the page) and `bin/` (the entry point).
`BUDGETED` in `scripts/size-budget-lib.mjs` covers the JavaScript under `src/`,
`bin/` and `scripts/` (principle 8). Add, renumber or drop principles as the
project needs; reviews cite them by number.

## Layers and dependencies

1. **The core stays pure.** `src/core/` holds the logic (board layout, hash
   parsing, document-ref choice) and imports nothing from `src/server/`,
   `src/web/` or any `node:` module, so the server and the browser can both
   load it as-is. *Enforced* by `src/architecture.test.mjs`, which reads every
   import in `src/core/` and fails on a forbidden one; a second case plants
   a bad import in a temp copy and proves the rule fires.
2. **Dependencies point one way.** `bin/` → `src/server/` → `src/core/`, and
   `src/web/` → `src/core/`. *Enforced* by the same test for what it names:
   `src/web/` never imports from `src/server/`, and nothing in `src/core/` or
   `src/web/` imports from outside `src/`. That `bin/` and `src/server/` do not
   import `src/web/` is *Judged*. **Recorded exception:** `src/server/repo.mjs` imports
   `readIntentMetadataFromBranch` from the kit's `scripts/session-io.mjs`, so
   the rule for "the branch that carries intent <id>" has one definition
   (principle 5). Server code may import the kit's `scripts/`; `src/core/` and
   `src/web/` may not.

## Where logic lives

3. **Logic lives in the core.** Entry points, adapters and UI only wire
   things up and present. *Judged.*
4. **One source of truth.** A rule, a number or a prompt has one home, and
   anything showing it reads from there. *Judged.*
5. **No duplicated code.** New code reuses an existing helper rather than
   adding a copy; two pieces that compute the same thing from the same inputs
   become one. Code that merely looks alike but has a different reason to
   change stays apart. *Judged*, and the KonMari step tidies what slips
   through.

## Size and structure

6. **Modules have one clear job.** A new module's purpose fits in a
   sentence, and new work doesn't pile into a large file when it has a
   natural home elsewhere. *Judged.*
7. **Few dependencies.** A new dependency needs a reason, is pinned and goes
   in the plan. *Judged* (review pass 8).
8. **Size limits and the budget.** A hand-written source file over 500 lines
   can't grow beyond its ceiling in `scripts/size-baseline.json`, and a
   ceiling can't rise by more than 50 lines per intent, or at all without a
   `budget: <path> +<n>: <reason>` line in the plan's "Where this goes". A
   change that shrinks a budgeted file lowers its ceiling
   (`npm run size:baseline -- --write`). *Enforced* by `npm run check:intent`.
   The ceiling counts physical lines (`wc -l` style).

## Tests and traceability

9. **Logic is testable without I/O.** New logic goes in pure functions with
   tests; only wiring, I/O and presentation rely on end-to-end tests and the
   live check. *Judged.*
10. **Behaviour that matters is proven.** A behavioural line has a test that
    fails when it is mutated (review pass 4). *Judged.*
11. **Interpretations leave a trace.** A reading of an ambiguous requirement,
    or a deliberate departure from one, gets a code comment where it is
    implemented. *Judged.*
12. **Structural decisions are written down.** A new layer, a new boundary or
    an exception goes in this file with its reason. *Judged.*

## Recorded exceptions

| Exception | Principle | Reason |
| --- | --- | --- |
| (none yet) | | |
