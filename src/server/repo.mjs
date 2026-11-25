// All I/O on the target repository (B3, B5-B9). Nothing else in the server
// touches it. The server never writes there: git is run with an argument array
// (never a shell string), only the subcommands in READ_ONLY_GIT (B9), and
// documents come from `git show`, never from the working tree.
// One recorded exception (docs/architecture.md, principle 2): the branch lookup
// is readIntentMetadataFromBranch in scripts/session-io.mjs, which runs git
// outside READ_ONLY_GIT. By reading it runs only for-each-ref, ls-tree and show.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chooseFolder, chooseRef } from '../core/docref.mjs';
import { DOCS } from '../core/hash.mjs';
// Server code may import the kit's scripts (docs/architecture.md, principle 2):
// one definition of "the branch that carries intent <id>".
import { readIntentMetadataFromBranch } from '../../scripts/session-io.mjs';

const MAIN = 'main';
export const QUEUE_TIMEOUT_MS = 30_000;
const MAX_BUFFER = 32 * 1024 * 1024;
const QUEUE_GROUPS = ['inFlight', 'queued', 'shipped', 'stopped', 'other'];

/** B9: the only git subcommands the server runs on the target repo. */
export const READ_ONLY_GIT = ['rev-parse', 'for-each-ref', 'ls-tree', 'show'];

/** An error whose message is fit to show the user as is. `status` is the HTTP status it maps to. */
export class RepoError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const run = (file, args, options) =>
  new Promise((resolveRun, reject) => {
    execFile(file, args, { encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER, ...options }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolveRun(stdout);
    });
  });

/** Runs one read-only git subcommand in `root`; stdout with CRLF normalised to LF. */
export async function gitRead(root, ...args) {
  if (!READ_ONLY_GIT.includes(args[0])) throw new Error(`git ${args[0]} is not allowed on the target repo`);
  const out = await run('git', args, { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  return out.replace(/\r\n/g, '\n');
}

/**
 * B3: checks that `path` is a git work tree with a `main` branch and a
 * `scripts/queue.mjs`. Returns `{ root, name }`; throws a RepoError whose
 * message is the one-line reason.
 */
export async function checkRepo(path) {
  const given = resolve(path);
  let root;
  try {
    root = resolve((await gitRead(given, 'rev-parse', '--show-toplevel')).trim());
  } catch {
    throw new RepoError(`${given} is not a git work tree`);
  }
  try {
    await gitRead(root, 'rev-parse', '--verify', '--quiet', `refs/heads/${MAIN}`);
  } catch {
    throw new RepoError(`${root} has no ${MAIN} branch`);
  }
  if (!existsSync(join(root, 'scripts', 'queue.mjs'))) throw new RepoError(`${root} has no scripts/queue.mjs`);
  return { root, name: basename(root) };
}

/**
 * B5, B6: the board data. I1: this runs the target repo's own
 * `scripts/queue.mjs --json`, not this repo's queue code, so the map always
 * agrees with that repo's `npm run queue`. The cost is that the server runs
 * code from the target repo, accepted because it is the owner's own repo.
 * I2: queue.mjs only reads git; B9 limits what this server itself runs.
 * Runs fresh on every call (no cache), with the node running this server
 * (not whatever `node` is on PATH), a timeout (30 s by default) and a capped buffer.
 */
export async function readQueue(root, { timeoutMs = QUEUE_TIMEOUT_MS } = {}) {
  let text;
  try {
    text = await run(process.execPath, ['scripts/queue.mjs', '--json'], { cwd: root, timeout: timeoutMs, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  } catch (e) {
    const why = e.killed ? `timed out after ${timeoutMs / 1000} s` : (e.stderr || e.message || '').trim().split('\n')[0] || `exit ${e.code}`;
    throw new RepoError(`scripts/queue.mjs failed: ${why}`, 502);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RepoError(`scripts/queue.mjs did not print JSON: ${text.trim().slice(0, 120) || '(nothing)'}`, 502);
  }
  if (!data || typeof data !== 'object' || !QUEUE_GROUPS.every((g) => Array.isArray(data[g]))) {
    throw new RepoError('scripts/queue.mjs printed JSON that is not a queue', 502);
  }
  const main = (await gitRead(root, 'rev-parse', '--short', MAIN)).trim();
  return { ...data, repo: basename(root), main, at: new Date().toISOString() };
}

/** The queue's record of intent `id`, or null. */
export function findInQueue(queue, id) {
  for (const g of QUEUE_GROUPS) {
    const hit = queue[g].find((i) => i.id === id);
    if (hit) return hit;
  }
  return null;
}

/** I3: the one local branch whose name carries `id`, by the kit's own rule; null when none or in conflict. */
function branchOf(root, id) {
  try {
    return readIntentMetadataFromBranch(root, String(id))?.branch ?? null;
  } catch {
    return null; // two branches carry the id: the queue says `branch conflict` and reads main
  }
}

/** The names in `ref:path`, or [] when it does not exist there. */
async function lsTree(root, ref, path) {
  try {
    return (await gitRead(root, 'ls-tree', '--name-only', `${ref}:${path}`)).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * B7, B8: intent `id`'s documents and the ref they were read from. `record`
 * is the queue's entry for it. The ref is the intent's branch when the queue
 * took its status from the branch, else main (I3); a missing document is null.
 */
export async function readIntent(root, record) {
  const { ref, from } = chooseRef(record.source, record.source === 'branch' ? branchOf(root, record.id) : null, MAIN);
  const folder = chooseFolder(record.id, await lsTree(root, ref, 'intents'));
  const present = folder ? await lsTree(root, ref, `intents/${folder}`) : [];
  const documents = {};
  for (const doc of DOCS) {
    documents[doc] = present.includes(`${doc}.md`) ? await gitRead(root, 'show', `${ref}:intents/${folder}/${doc}.md`) : null;
  }
  return { id: record.id, ref, from, folder, intent: record, documents };
}
