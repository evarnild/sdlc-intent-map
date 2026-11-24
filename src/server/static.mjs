// Maps the fixed URL prefixes to files (B22, B23). Nothing outside these
// prefixes is ever served, and a request cannot climb out of them.
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(SRC, '..');

/** `/` is the page; `/web/*` and `/core/*` are the app's own modules; `/vendor/*` the two local packages. */
const FIXED = {
  '/': join(SRC, 'web', 'index.html'),
  '/vendor/marked.js': join(APP, 'node_modules', 'marked', 'lib', 'marked.esm.js'),
  '/vendor/purify.js': join(APP, 'node_modules', 'dompurify', 'dist', 'purify.es.mjs'),
};
const DIRS = { '/web/': join(SRC, 'web'), '/core/': join(SRC, 'core') };

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** The file for URL path `pathname`, or null. Tests and dotfiles are never served. */
export function resolveStatic(pathname) {
  if (Object.hasOwn(FIXED, pathname)) return FIXED[pathname];
  for (const [prefix, dir] of Object.entries(DIRS)) {
    if (!pathname.startsWith(prefix)) continue;
    let rel;
    try {
      rel = decodeURIComponent(pathname.slice(prefix.length));
    } catch {
      return null;
    }
    if (!rel || rel.includes('\0') || rel.includes('\\') || rel.split('/').some((s) => s === '' || s.startsWith('.'))) return null;
    if (/\.test\.m?js$/.test(rel) || !TYPES[extname(rel)]) return null;
    const file = resolve(dir, rel);
    return file.startsWith(dir + sep) ? file : null;
  }
  return null;
}

/** `{ body, type }` for a URL path, or null when it is not served or the file is missing. */
export async function readStatic(pathname) {
  const file = resolveStatic(pathname);
  if (!file) return null;
  try {
    return { body: await readFile(file), type: TYPES[extname(file)] };
  } catch {
    return null;
  }
}
