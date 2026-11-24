// Test helper: builds a throwaway git repository holding the kit's queue
// scripts and given intents on `main` and on branches, so no test ever touches
// a real repo. Everything lives under the OS temp directory.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The scripts `queue.mjs` needs, with everything it imports (one list, so drift fails loudly). */
export const KIT_FILES = ['queue.mjs', 'blockers-lib.mjs', 'intent-check-lib.mjs', 'queue-lib.mjs', 'session-io.mjs', 'session-lib.mjs'];

const RELATIVE_IMPORT = /\bfrom\s+['"]\.\/([\w.-]+)['"]/g;

/** Throws naming the file when a kit script is missing or imports one that KIT_FILES lacks. */
function checkKitFiles() {
  for (const f of KIT_FILES) {
    const p = join(REPO, 'scripts', f);
    if (!existsSync(p)) throw new Error(`fixture-repo: kit file scripts/${f} is missing; update KIT_FILES`);
    for (const m of readFileSync(p, 'utf8').matchAll(RELATIVE_IMPORT)) {
      if (!KIT_FILES.includes(m[1])) throw new Error(`fixture-repo: scripts/${f} imports ${m[1]}, which KIT_FILES does not copy; add it`);
    }
  }
}

/** A flat metadata.yml like the kit's templates. `blocked_by` is a list of `<id>  <reason>` strings. */
export function metadataYml(fields) {
  const lines = [];
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`, ...v.map((x) => `  - ${x}`));
    } else {
      lines.push(`${k}: ${v ?? ''}`.trimEnd());
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Files of one intent folder: { 'intents/<id>-<slug>/metadata.yml': … } plus
 * each document given in `docs` (`{ intent: '…', spec: '…' }`).
 */
export function intentFiles(id, slug, meta, docs = {}) {
  const dir = `intents/${id}-${slug}`;
  const files = { [`${dir}/metadata.yml`]: metadataYml({ id, slug, type: 'feature', title: `Title ${id}`, status: 'draft', ...meta }) };
  for (const [name, text] of Object.entries(docs)) files[`${dir}/${name}.md`] = text;
  return files;
}

/** Creates the repo with `main` checked out and the kit's scripts committed. Call `cleanup()` when done. */
export function createFixture() {
  checkKitFiles();
  const dir = mkdtempSync(join(tmpdir(), 'intent-map-fx-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (rel, text) => {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  };
  const commit = (files, message) => {
    for (const [rel, text] of Object.entries(files)) write(rel, text);
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', '--short', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'Fixture');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.autocrlf', 'false');
  mkdirSync(join(dir, 'scripts'));
  for (const f of KIT_FILES) copyFileSync(join(REPO, 'scripts', f), join(dir, 'scripts', f));
  git('add', '-A');
  git('commit', '-q', '-m', 'kit scripts');
  return {
    dir,
    git,
    write,
    /** Commits `files` on the current branch (main by default). */
    commit,
    /** Creates `name` from main, commits `files` on it and returns to main. */
    branch(name, files, message = `work on ${name}`) {
      git('checkout', '-q', '-b', name, 'main');
      commit(files, message);
      git('checkout', '-q', 'main');
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
