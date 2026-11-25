// B24 / AC12: the layer rules, enforced by reading every import in
// src/core and src/web. A second case plants a bad import in a temp copy and
// proves the rule fires, so the rule cannot rot into a no-op.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

// `fs` and `node:fs` are the same module: both count as a node: import.
const BUILTINS = new Set(builtinModules);
const isBuiltin = (spec) => spec.startsWith('node:') || BUILTINS.has(spec) || BUILTINS.has(spec.split('/')[0]);

const IMPORT_RES = [
  /\bimport\s+(?:[\w*${}\s,]+?\s+from\s+)?['"]([^'"]+)['"]/g, // import x from '…', import '…'
  /\bexport\s+(?:[\w*${}\s,]+?)\s+from\s+['"]([^'"]+)['"]/g, // export … from '…'
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, // import('…')
];

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.m?js$/.test(e.name)) yield p;
  }
}

export const importsOf = (text) => IMPORT_RES.flatMap((re) => [...text.matchAll(re)].map((m) => m[1]));

/** Violations of B24 under `src` (a directory laid out like the real src/). */
export function findViolations(src) {
  const out = [];
  const layerOf = (abs) => relative(src, abs).split(sep)[0];
  for (const layer of ['core', 'web']) {
    const dir = join(src, layer);
    try {
      readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of walk(dir)) {
      if (/\.test\.mjs$/.test(file)) continue; // tests may use node:; they are not shipped
      for (const spec of importsOf(readFileSync(file, 'utf8'))) {
        const where = `${relative(src, file).split(sep).join('/')} imports '${spec}'`;
        if (isBuiltin(spec)) {
          if (layer === 'core') out.push(`${where}: src/core must not import node: modules`);
          continue;
        }
        if (!spec.startsWith('.')) continue; // bare packages and root-relative URLs: not a layer
        const target = resolve(dirname(file), spec);
        const rel = relative(src, target);
        const top = rel.startsWith('..') ? '(outside src)' : layerOf(target);
        const bad = layer === 'core' ? ['server', 'web', '(outside src)'] : ['server', '(outside src)'];
        if (bad.includes(top)) out.push(`${where}: src/${layer} must not import ${top === '(outside src)' ? 'from outside src/' : `from src/${top}/`}`);
      }
    }
  }
  return out;
}

describe('architecture (B24)', () => {
  it('the real tree has no violations', () => {
    assert.deepEqual(findViolations(SRC), []);
  });

  it('fires on planted bad imports', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'arch-'));
    try {
      for (const d of ['core', 'web', 'server']) mkdirSync(join(tmp, 'src', d), { recursive: true });
      const put = (f, t) => writeFileSync(join(tmp, 'src', f), t);
      put('server/s.mjs', 'export const s = 1;\n');
      put('web/w.mjs', 'export const w = 1;\n');
      put('core/ok.mjs', "import { x } from './other.mjs';\nexport const ok = x;\n");
      put('core/other.mjs', 'export const x = 1;\n');
      assert.deepEqual(findViolations(join(tmp, 'src')), []);

      put('core/a.mjs', "import { s } from '../server/s.mjs';\nexport default s;\n");
      put('core/b.mjs', "import fs from 'node:fs';\nexport default fs;\n");
      put('core/c.mjs', "export default await import('../web/w.mjs');\n");
      put('web/d.mjs', "import { s } from '../server/s.mjs';\nexport default s;\n");
      put('core/f.mjs', "import { join } from 'path';\nexport default join;\n");
      put('core/g.mjs', "import { readFile } from 'fs/promises';\nexport default readFile;\n");
      put('core/e.mjs', "export { s } from '../server/s.mjs';\n");
      const v = findViolations(join(tmp, 'src'));
      for (const f of ['core/a.mjs', 'core/b.mjs', 'core/c.mjs', 'web/d.mjs', 'core/e.mjs', 'core/f.mjs', 'core/g.mjs']) {
        assert.ok(v.some((m) => m.startsWith(f)), `no violation reported for ${f}: ${v.join('; ')}`);
      }
      assert.equal(v.length, 7);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
