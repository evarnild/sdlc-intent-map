// The HTTP server (B2, B5, B8). `node:http`, no framework. It only wires
// requests to repo.mjs and static.mjs; the logic lives in src/core.
import { createServer } from 'node:http';
import { checkRepo, findInQueue, readIntent, readQueue, RepoError } from './repo.mjs';
import { readStatic } from './static.mjs';

export const DEFAULT_PORT = 5300;
export const HOST = '127.0.0.1';
const USAGE = 'Usage: intent-map [<repo>] [--port <n>]';

/** B1: `[repo] [--port n]` (also `--port=n`). Defaults: the current directory, port 5300. Throws Error with a one-line reason. */
export function parseArgs(argv, cwd = process.cwd()) {
  let repo = null;
  let port = DEFAULT_PORT;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let value;
    if (a === '--port') value = argv[++i];
    else if (a.startsWith('--port=')) value = a.slice('--port='.length);
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}. ${USAGE}`);
    else if (repo === null) {
      repo = a;
      continue;
    } else throw new Error(`more than one repo given. ${USAGE}`);
    if (value === undefined || !/^\d+$/.test(value) || Number(value) > 65535) throw new Error(`--port needs a number from 0 to 65535, got "${value ?? ''}"`);
    port = Number(value);
  }
  return { repo: repo ?? cwd, port };
}

const send = (res, status, type, body, extra = {}) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(body);
};
const sendJson = (res, status, data) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(data));

// Nothing but this origin: no CDN, no inline script (B22). Style attributes are
// allowed for the SVG board.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

async function route(ctx, req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/queue') return sendJson(res, 200, await readQueue(ctx.root, ctx));
  const m = /^\/api\/intent\/([^/]*)$/.exec(pathname);
  if (m) {
    // Digits only, before anything is looked up: no path or option can ride in an id.
    if (!/^\d+$/.test(m[1])) return sendJson(res, 404, { error: 'no such intent' });
    const queue = await readQueue(ctx.root, ctx);
    const record = findInQueue(queue, Number(m[1]));
    if (!record) return sendJson(res, 404, { error: `no intent §${Number(m[1])} in this repo` });
    return sendJson(res, 200, await readIntent(ctx.root, record));
  }
  const file = await readStatic(pathname);
  if (!file) return sendJson(res, 404, { error: 'not found' });
  return send(res, 200, file.type, file.body, file.type.startsWith('text/html') ? { 'Content-Security-Policy': CSP } : {});
}

/** Builds the (not yet listening) server for the repo at `root`. */
export function createIntentMapServer(root, { queueTimeoutMs } = {}) {
  const ctx = { root, timeoutMs: queueTimeoutMs };
  const server = createServer((req, res) => {
    // DNS rebinding: a page on another site that resolves to 127.0.0.1 sends
    // its own name as Host. This runs before routing, so it guards everything.
    const port = server.address()?.port;
    if (req.headers.host !== `localhost:${port}` && req.headers.host !== `${HOST}:${port}`) {
      return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden: unexpected Host header');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    route(ctx, req, res).catch((e) => {
      if (res.headersSent) return res.end();
      return sendJson(res, e instanceof RepoError ? e.status : 500, { error: e instanceof RepoError ? e.message : 'internal error' });
    });
  });
  return server;
}

/**
 * B1-B3: checks the repo, then listens on 127.0.0.1 only. Resolves with
 * `{ server, port, url, root }`; rejects with an Error whose message is the
 * one-line reason (not a git repo, no main, no queue.mjs, port taken).
 */
export async function startServer({ repo, port = DEFAULT_PORT, queueTimeoutMs }) {
  const { root } = await checkRepo(repo);
  const server = createIntentMapServer(root, { queueTimeoutMs });
  await new Promise((resolveListen, reject) => {
    server.once('error', (e) => reject(e.code === 'EADDRINUSE' ? new Error(`port ${port} is already in use`) : e));
    server.listen(port, HOST, resolveListen);
  });
  const bound = server.address().port;
  return { server, root, port: bound, url: `http://localhost:${bound}/` };
}
