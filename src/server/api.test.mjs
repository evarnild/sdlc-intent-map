// AC3-AC6 (B5-B9) and the Host check, against throwaway fixture repos.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createFixture, intentFiles } from '../test/fixture-repo.mjs';
import { gitRead, QUEUE_TIMEOUT_MS, READ_ONLY_GIT } from './repo.mjs';
import { startServer } from './server.mjs';

const cleanups = [];
after(async () => {
  for (const f of cleanups.reverse()) await f();
});

async function serve(fx, options = {}) {
  const s = await startServer({ repo: fx.dir, port: 0, ...options });
  cleanups.push(() => new Promise((r) => s.server.close(r)));
  return { base: `http://127.0.0.1:${s.port}`, port: s.port };
}
const getJson = async (base, path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};
/** A GET with a chosen Host header (fetch will not let a script set one). */
const getWithHost = (port, host, path = '/api/queue') =>
  new Promise((done, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers: { Host: host } }, (res) => {
      res.resume();
      res.on('end', () => done(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });

/** A repo where main and the branch hold different spec.md text (so reading the wrong ref fails). */
function buildFixture() {
  const fx = createFixture();
  fx.commit(
    {
      ...intentFiles(1, 'shipped', { status: 'done', merged: 'abc1234' }, { intent: 'MAIN intent 1', spec: 'MAIN spec 1' }),
      ...intentFiles(2, 'unmerged', { status: 'draft' }, { intent: 'MAIN intent 2', spec: 'MAIN spec 2' }),
      ...intentFiles(3, 'blocked', { status: 'accepted', blocked_by: ['2  needs two first'] }, { intent: 'line one\r\nline two\r\n' }),
      ...intentFiles(5, 'twin', { status: 'draft' }, { spec: 'MAIN spec 5' }),
    },
    'intents on main',
  );
  fx.branch(
    'feat/2-unmerged',
    intentFiles(2, 'unmerged', { status: 'in-review' }, { intent: 'MAIN intent 2', spec: 'BRANCH spec 2', plan: 'BRANCH plan 2', review: 'BRANCH review 2' }),
  );
  fx.branch('feat/5-twin', intentFiles(5, 'twin', { status: 'in-review' }, { spec: 'BRANCH A spec 5' }));
  fx.branch('fix/5-twin-too', intentFiles(5, 'twin', { status: 'in-progress' }, { spec: 'BRANCH B spec 5' }));
  return fx;
}

describe('read-only API on a fixture repo', () => {
  let fx;
  let api;
  let refsBefore;
  before(async () => {
    fx = buildFixture();
    cleanups.push(() => fx.cleanup());
    refsBefore = fx.git('for-each-ref');
    api = await serve(fx);
  });

  describe('/api/queue (AC3, B5)', () => {
    it('is the target repo\'s own queue --json plus repo, main and at', async () => {
      const own = JSON.parse(execFileSync(process.execPath, ['scripts/queue.mjs', '--json'], { cwd: fx.dir, encoding: 'utf8' }));
      const { status, body } = await getJson(api.base, '/api/queue');
      assert.equal(status, 200);
      const { repo, main, at, ...queue } = body;
      assert.deepEqual(queue, own);
      assert.equal(repo, basename(fx.dir));
      assert.equal(main, fx.git('rev-parse', '--short', 'main'));
      assert.ok(!Number.isNaN(Date.parse(at)) && at === new Date(at).toISOString());
    });

    it('is read fresh on every request: a newly committed intent shows up', async () => {
      const before = await getJson(api.base, '/api/queue');
      assert.ok(!JSON.stringify(before.body).includes('"id":9,'));
      fx.commit(intentFiles(9, 'late', { status: 'draft' }, { intent: 'late' }), 'a new intent');
      const after = await getJson(api.base, '/api/queue');
      assert.ok(after.body.queued.some((i) => i.id === 9));
      assert.equal(after.body.main, fx.git('rev-parse', '--short', 'main'));
      assert.notEqual(after.body.main, before.body.main);
    });
  });

  describe('/api/intent/<id> (AC5, B7, B8, I3)', () => {
    it('reads an unmerged intent from its branch, not main', async () => {
      const { status, body } = await getJson(api.base, '/api/intent/2');
      assert.equal(status, 200);
      assert.equal(body.ref, 'feat/2-unmerged');
      assert.equal(body.from, 'branch');
      assert.equal(body.documents.spec, 'BRANCH spec 2');
      assert.equal(body.documents.plan, 'BRANCH plan 2');
      assert.equal(body.documents.review, 'BRANCH review 2');
      assert.equal(body.intent.status, 'in-review');
    });

    it('does not read the working tree: an uncommitted edit stays invisible', async () => {
      fx.write('intents/1-shipped/spec.md', 'EDITED IN WORKING TREE');
      try {
        const { body } = await getJson(api.base, '/api/intent/1');
        assert.equal(body.documents.spec, 'MAIN spec 1');
      } finally {
        fx.git('checkout', '--', 'intents/1-shipped/spec.md');
      }
    });

    it('reads a merged intent from main, with missing documents as null', async () => {
      const { body } = await getJson(api.base, '/api/intent/1');
      assert.equal(body.ref, 'main');
      assert.equal(body.from, 'main');
      assert.deepEqual(body.documents, { intent: 'MAIN intent 1', spec: 'MAIN spec 1', plan: null, review: null, konmari: null });
      assert.equal(body.intent.status, 'done');
    });

    it('reads main when the intent is on two branches (branch conflict)', async () => {
      const { body } = await getJson(api.base, '/api/intent/5');
      assert.equal(body.intent.source, 'branch conflict');
      assert.equal(body.ref, 'main');
      assert.equal(body.documents.spec, 'MAIN spec 5');
    });

    it('returns the queue\'s fields, including blockers, and LF line endings', async () => {
      const { body } = await getJson(api.base, '/api/intent/3');
      assert.deepEqual(body.intent.blocked_by, [{ id: 2, reason: 'needs two first' }]);
      assert.deepEqual(body.intent.blocked_by_open, [2]);
      assert.equal(body.documents.intent, 'line one\nline two\n');
    });

    it('answers 404 for an id that is not in the queue', async () => {
      assert.equal((await getJson(api.base, '/api/intent/404')).status, 404);
    });

    it('answers 404 for anything that is not a plain number', async () => {
      for (const id of ['..%2F..', '..%2F..%2Fscripts%2Fqueue.mjs', 'abc', '-1', '1.5', '1%2F..', '', '2%00']) {
        const r = await getJson(api.base, `/api/intent/${id}`);
        assert.equal(r.status, 404, `id "${id}"`);
      }
    });

    it('serves no other path of the target repo', async () => {
      for (const p of ['/scripts/queue.mjs', '/intents/2-unmerged/spec.md', '/.git/config', '/web/../../package.json', '/web/%2e%2e/%2e%2e/package.json', '/core/layout.test.mjs']) {
        const res = await fetch(api.base + p);
        assert.equal(res.status, 404, p);
      }
    });
  });

  describe('Host check', () => {
    it('refuses a foreign Host before routing, for the API and the page', async () => {
      assert.equal(await getWithHost(api.port, 'evil.example:5300'), 403);
      assert.equal(await getWithHost(api.port, `evil.example:${api.port}`, '/'), 403);
      assert.equal(await getWithHost(api.port, 'evil.example', '/api/intent/1'), 403);
      assert.equal(await getWithHost(api.port, `127.0.0.1.evil.example:${api.port}`), 403);
    });
    it('matches the Host exactly: another name that starts with localhost, or another port, is refused', async () => {
      assert.equal(await getWithHost(api.port, `localhost.evil.example:${api.port}`), 403);
      assert.equal(await getWithHost(api.port, `localhost:${api.port + 1}`), 403);
      assert.equal(await getWithHost(api.port, `127.0.0.1:${api.port + 1}`), 403);
    });
    it('accepts localhost and 127.0.0.1 on the bound port', async () => {
      assert.equal(await getWithHost(api.port, `localhost:${api.port}`), 200);
      assert.equal(await getWithHost(api.port, `127.0.0.1:${api.port}`), 200);
    });
    it('answers 405 to anything but GET and HEAD', async () => {
      const res = await fetch(`${api.base}/api/queue`, { method: 'POST' });
      assert.equal(res.status, 405);
    });
  });

  describe('read-only (AC6, B9)', () => {
    it('leaves the working tree clean and the refs unchanged', () => {
      assert.equal(fx.git('status', '--porcelain'), '');
      // the freshness test added one commit to main on purpose; compare every ref but main
      const strip = (s) => s.split('\n').filter((l) => !l.endsWith('\trefs/heads/main')).join('\n');
      assert.equal(strip(fx.git('for-each-ref')), strip(refsBefore));
    });
  });
});

describe('a failing queue (AC4, B6)', () => {
  for (const [name, script] of [
    ['exits 1', "console.error('boom from queue'); process.exit(1);\n"],
    ['prints something that is not JSON', "console.log('not json at all');\n"],
    ['prints JSON that is not a queue', "console.log('{\"x\": 1}');\n"],
  ]) {
    it(`gives an error response carrying the message when queue.mjs ${name}`, async () => {
      const fx = createFixture();
      cleanups.push(() => fx.cleanup());
      fx.commit({ 'scripts/queue.mjs': script }, 'break the queue');
      const api = await serve(fx);
      for (const path of ['/api/queue', '/api/intent/1']) {
        const { status, body } = await getJson(api.base, path);
        assert.equal(status, 502, path);
        assert.match(body.error, /queue\.mjs/);
        assert.ok(!('inFlight' in body));
      }
      const { body } = await getJson(api.base, '/api/queue');
      if (name === 'exits 1') assert.match(body.error, /boom from queue/);
      if (name === 'prints something that is not JSON') assert.match(body.error, /not json at all/);
    });
  }
});

describe('the id guard runs before the queue (MEDIUM-1)', () => {
  it('answers 404, not 502, for a non-numeric id even when queue.mjs fails', async () => {
    const fx = createFixture();
    cleanups.push(() => fx.cleanup());
    fx.commit({ 'scripts/queue.mjs': 'process.exit(1);\n' }, 'break the queue');
    const api = await serve(fx);
    assert.equal((await getJson(api.base, '/api/intent/1')).status, 502); // a number does reach the queue
    for (const id of ['abc', '..%2F..', '1.5', '-1']) assert.equal((await getJson(api.base, `/api/intent/${id}`)).status, 404, id);
  });
});

describe('queue timeout (AC4, B6)', () => {
  it('defaults to 30 s', () => assert.equal(QUEUE_TIMEOUT_MS, 30_000));
  it('answers 502 "timed out" when queue.mjs never exits, and leaves no process behind', { timeout: 20_000 }, async () => {
    const fx = createFixture();
    cleanups.push(() => fx.cleanup());
    fx.commit({ 'scripts/queue.mjs': "import { writeFileSync } from 'node:fs';\nwriteFileSync('queue.pid', String(process.pid));\nsetInterval(() => {}, 1000);\n" }, 'hang');
    const api = await serve(fx, { queueTimeoutMs: 500 });
    const t0 = Date.now();
    const { status, body } = await getJson(api.base, '/api/queue');
    assert.equal(status, 502);
    assert.match(body.error, /timed out/);
    assert.ok(Date.now() - t0 < 10_000, 'the timeout parameter is used');
    const pidFile = join(fx.dir, 'queue.pid');
    assert.ok(existsSync(pidFile), 'the fixture queue.mjs ran');
    const pid = Number(readFileSync(pidFile, 'utf8'));
    let alive = true;
    for (let i = 0; i < 50 && alive; i++) {
      try {
        process.kill(pid, 0);
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        alive = false;
      }
    }
    assert.equal(alive, false, 'the hung queue.mjs was killed');
  });
});

describe('the git allow-list (AC6, B9)', () => {
  it('lists only read-only subcommands', () => assert.deepEqual(READ_ONLY_GIT, ['rev-parse', 'for-each-ref', 'ls-tree', 'show']));
  it('rejects any other subcommand without running it', async () => {
    const fx = createFixture();
    cleanups.push(() => fx.cleanup());
    for (const args of [['checkout', '-b', 'sneaky'], ['commit', '--allow-empty', '-m', 'x'], ['config', 'user.name', 'x']]) {
      await assert.rejects(gitRead(fx.dir, ...args), /not allowed/, args[0]);
    }
    assert.equal(fx.git('branch', '--list', 'sneaky'), '');
    assert.equal(fx.git('rev-list', '--count', 'HEAD'), '1');
    assert.equal(fx.git('config', 'user.name'), 'Fixture');
    assert.match(await gitRead(fx.dir, 'rev-parse', '--abbrev-ref', 'HEAD'), /^main/);
  });
});
