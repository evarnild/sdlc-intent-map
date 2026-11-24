// Which git ref and which folder an intent's documents are read from (B7, I3).
// Pure: the git lookups themselves are src/server/repo.mjs.

/**
 * I3: the queue's JSON says `source: branch | main | branch conflict` but not
 * the branch name, so the server finds the branch (by the rule of
 * readIntentMetadataFromBranch) and passes it here. Documents come from the
 * branch only when the queue used the branch for the status; on a
 * `branch conflict`, or when no branch is found, from `main`, as the queue's
 * status does. Never the working tree.
 */
export function chooseRef(source, branchName, mainRef = 'main') {
  if (source === 'branch' && branchName) return { ref: branchName, from: 'branch' };
  return { ref: mainRef, from: 'main' };
}

/** The `intents/` folder for an id among the folder names of a ref: the one starting `<id>-` (B7). */
export function chooseFolder(id, names) {
  const prefix = `${Number(id)}-`;
  const hits = names.filter((n) => n.startsWith(prefix)).sort();
  return hits[0] ?? null;
}
