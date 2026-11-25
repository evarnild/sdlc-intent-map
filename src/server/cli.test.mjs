// AC1, AC2 (B1-B3): starting, binding and refusing. Ports are 0 or a port the
// test itself holds; every server and child process the test starts is stopped.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture } from '../test/fixture-repo.mjs';
import { DEFAULT_PORT, parseArgs, startServer } from './server.mjs';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'intent-map.mjs');
const cleanups = [];
after(() => cleanups.forEach((f) => f()));

const fixture = () => {
  const fx = createFixture();
  cleanups.push(() => fx.cleanup());
  return fx;
};

/** Runs the CLI to completion: { code, stdout, stderr }. */
const runCli = (args, cwd) =>
  new Promise((done) => {
    execFile(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', timeout: 20_000 }, (err, stdout, stderr) => {
      done({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr });
    });
  });

describe('parseArgs (B1)', () => {
  it('defaults to the current directory and port 5300', () => {
    assert.equal(DEFAULT_PORT, 5300);
    assert.deepEqual(parseArgs([], '/somewhere'), { repo: '/somewhere', port: 5300 });
  });
  it('takes a repo and --port in either form', () => {
    assert.deepEqual(parseArgs(['/r', '--port', '5401']), { repo: '/r', port: 5401 });
    assert.deepEqual(parseArgs(['--port=5402', '/r']), { repo: '/r', port: 5402 });
  });
  it('rejects a bad port, an unknown option and two repos', () => {
    assert.throws(() => parseArgs(['--port', 'abc']), /--port needs a number/);
    assert.throws(() => parseArgs(['--port']), /--port needs a number/);
    assert.throws(() => parseArgs(['--port', '70000']), /--port needs a number/);
    assert.throws(() => parseArgs(['--nope']), /unknown option/);
    assert.throws(() => parseArgs(['a', 'b']), /more than one repo/);
  });
});

describe('startServer (AC1, AC2)', () => {
  it('binds 127.0.0.1 only and answers /', async () => {
    const fx = fixture();
    const { server, port, url } = await startServer({ repo: fx.dir, port: 0 });
    try {
      assert.equal(server.address().address, '127.0.0.1');
      assert.equal(url, `http://localhost:${port}/`);
      const res = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/html/);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('refuses a taken port, naming it', async () => {
    const fx = fixture();
    const holder = createNetServer();
    await new Promise((r) => holder.listen(0, '127.0.0.1', r));
    const taken = holder.address().port;
    try {
      await assert.rejects(startServer({ repo: fx.dir, port: taken }), new RegExp(`port ${taken} is already in use`));
    } finally {
      await new Promise((r) => holder.close(r));
    }
  });
});

describe('the command line (AC1, B2, B3)', () => {
  it('prints the URL, serves it, and stops when killed', async () => {
    const fx = fixture();
    const child = spawn(process.execPath, [BIN, fx.dir, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    cleanups.push(() => child.kill());
    try {
      const url = await new Promise((resolveUrl, reject) => {
        let out = '';
        child.stdout.on('data', (d) => {
          out += d;
          const m = /(http:\/\/localhost:\d+\/)/.exec(out);
          if (m) resolveUrl(m[1]);
        });
        child.once('exit', (code) => reject(new Error(`exited ${code} before printing a URL: ${out}`)));
      });
      assert.equal((await fetch(url)).status, 200);
    } finally {
      child.kill();
    }
  });

  it('refuses a directory that is not a git work tree', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'intent-map-notgit-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const r = await runCli([dir, '--port', '0']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /not a git work tree/);
    assert.equal(r.stderr.trim().split('\n').length, 1);
  });

  it('refuses a repo with no main branch', async () => {
    const fx = fixture();
    fx.git('branch', '-m', 'main', 'trunk');
    const r = await runCli([fx.dir, '--port', '0']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /no main branch/);
  });

  it('refuses a repo with no scripts/queue.mjs', async () => {
    const fx = fixture();
    fx.git('rm', '-q', 'scripts/queue.mjs');
    fx.git('commit', '-q', '-m', 'drop queue');
    const r = await runCli([fx.dir, '--port', '0']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /no scripts\/queue\.mjs/);
  });

  it('refuses a taken port, naming it', async () => {
    const fx = fixture();
    const holder = createNetServer();
    await new Promise((r) => holder.listen(0, '127.0.0.1', r));
    const taken = holder.address().port;
    try {
      const r = await runCli([fx.dir, '--port', String(taken)]);
      assert.notEqual(r.code, 0);
      assert.match(r.stderr, new RegExp(`port ${taken} is already in use`));
    } finally {
      await new Promise((r) => holder.close(r));
    }
  });

  it('uses the current directory when no repo is given', async () => {
    const fx = fixture();
    fx.git('branch', '-m', 'main', 'trunk'); // refusal names the cwd repo, proving it was the one used
    const r = await runCli(['--port', '0'], fx.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /no main branch/);
  });
});
