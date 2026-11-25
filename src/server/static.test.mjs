// AC11 (B22): the page loads nothing from another host. A scan of every URL
// in the page's HTML, CSS and JS, and a check that what they name is served.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture } from '../test/fixture-repo.mjs';
import { resolveStatic } from './static.mjs';
import { startServer } from './server.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(html|css|mjs)$/.test(e.name) && !/\.test\.mjs$/.test(e.name)) yield p;
  }
}

// Every way the page can name a URL: attributes, CSS url(), static and dynamic
// import, fetch().
const URL_PATTERNS = [
  /\b(?:src|href|action|poster)\s*=\s*["']([^"']*)["']/g,
  /\burl\(\s*["']?([^"')]*)["']?\s*\)/g,
  /\bimport\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\bfetch\(\s*["'`]([^"'`]+)["'`]/g,
  /@import\s+["']([^"']+)["']/g,
];
const local = (u) => u === '' || /^(\.{1,2}\/|\/(?!\/)|#)/.test(u);

describe('no external host (AC11, B22)', () => {
  it('every URL in src/web and src/core is relative or root-relative', () => {
    let scanned = 0;
    for (const dir of ['web', 'core']) {
      for (const file of files(join(SRC, dir))) {
        const text = readFileSync(file, 'utf8');
        for (const re of URL_PATTERNS) {
          for (const m of text.matchAll(re)) {
            scanned++;
            assert.ok(local(m[1]), `${file}: "${m[1]}" is not relative or root-relative`);
          }
        }
        assert.ok(!/@import/.test(text), `${file}: @import`);
      }
    }
    assert.ok(scanned >= 8, `the scan found only ${scanned} URLs; the patterns are not matching`);
  });

  it('the scan itself rejects an external URL', () => {
    assert.equal(local('https://cdn.example/x.js'), false);
    assert.equal(local('//cdn.example/x.js'), false);
    assert.equal(local('/web/app.mjs'), true);
    assert.equal(local('./a.mjs'), true);
    const bad = '<link rel="stylesheet" href="https://fonts.example/css">';
    assert.ok([...bad.matchAll(URL_PATTERNS[0])].some((m) => !local(m[1])));
  });
});

describe('resolveStatic', () => {
  it('maps the fixed prefixes', () => {
    assert.equal(resolveStatic('/'), join(SRC, 'web', 'index.html'));
    assert.equal(resolveStatic('/web/app.mjs'), join(SRC, 'web', 'app.mjs'));
    assert.equal(resolveStatic('/core/layout.mjs'), join(SRC, 'core', 'layout.mjs'));
    assert.match(resolveStatic('/vendor/marked.js'), /node_modules[\\/]marked/);
    assert.match(resolveStatic('/vendor/purify.js'), /node_modules[\\/]dompurify/);
  });
  it('refuses traversal, tests, dotfiles and anything else', () => {
    for (const p of ['/web/../architecture.test.mjs', '/web/%2e%2e/server/server.mjs', '/web/..%2f..%2fpackage.json', '/web/a\\b.mjs', '/core/layout.test.mjs', '/web/.env', '/web/', '/web/%00.css', '/vendor/other.js', '/node_modules/marked/package.json', '/src/server/server.mjs', '/package.json', '/web/%E0%A4%A.css']) {
      assert.equal(resolveStatic(p), null, p);
    }
  });
});

describe('served over HTTP', () => {
  let fx;
  let s;
  before(async () => {
    fx = createFixture();
    s = await startServer({ repo: fx.dir, port: 0 });
  });
  after(async () => {
    await new Promise((r) => s.server.close(r));
    fx.cleanup();
  });

  it('serves the page, its CSS and modules, and the two vendor packages locally', async () => {
    const want = { '/': 'text/html', '/web/style.css': 'text/css', '/web/app.mjs': 'text/javascript', '/web/render.mjs': 'text/javascript', '/core/layout.mjs': 'text/javascript', '/core/hash.mjs': 'text/javascript', '/vendor/marked.js': 'text/javascript', '/vendor/purify.js': 'text/javascript' };
    for (const [path, type] of Object.entries(want)) {
      const res = await fetch(`http://127.0.0.1:${s.port}${path}`);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get('content-type'), new RegExp(type), path);
    }
  });

  it('the vendor modules are self-contained ES modules (no imports of their own)', async () => {
    for (const p of ['/vendor/marked.js', '/vendor/purify.js']) {
      const text = await (await fetch(`http://127.0.0.1:${s.port}${p}`)).text();
      assert.ok(/\bexport\b/.test(text), `${p} is not an ES module`);
      assert.ok(!/^\s*import\s[^(]/m.test(text), `${p} imports something`);
    }
  });

  it('sends a CSP that allows only this origin, and nosniff', async () => {
    const res = await fetch(`http://127.0.0.1:${s.port}/`);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.ok(!/https?:|\*/.test(csp));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('does not serve test files or other paths', async () => {
    for (const p of ['/core/layout.test.mjs', '/web/render.test.mjs', '/web/../../package.json']) {
      assert.equal((await fetch(`http://127.0.0.1:${s.port}${p}`)).status, 404, p);
    }
  });
});
