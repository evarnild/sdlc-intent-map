# sdlc-intent-map

An interactive intent map, like the Claude artifact, that runs standalone on a local machine.

Run with the AI-native SDLC from the start.

Point it at a repository that carries the kit's `intents/` and
`scripts/queue.mjs`, and it serves a board of that repo's intents on
localhost: open work as counters in columns, red arrows for open blockers, and
a reader for each intent's documents (intent, spec, plan, review, konmari),
read from git (the branch while unmerged, else `main`). It never writes to the
target repository.

```
npm ci                      # once: installs the pinned dependencies (a fresh worktree: npm run setup:worktree)
npm start -- <repo>         # serve <repo> on http://localhost:5300/ (default: the current directory)
npm start -- <repo> --port 5301
```

It needs Node ≥ 22 and a git repository with a `main` branch and
`scripts/queue.mjs`. It listens on 127.0.0.1 only and loads nothing from
another host.

See [`sdlc.md`](sdlc.md) for how a change moves from intent to merge,
[`OVERVIEW.md`](OVERVIEW.md) for the snapshot, and `npm run queue` for what is
queued.

```
npm run verify          # the one check before a change is done (lint, kit tests, app tests)
npm run check:intent    # does this branch match its intent?
npm run queue           # every intent by status, generated from metadata.yml
npm run setup:worktree  # npm ci, for a fresh worktree
```
