// URL hash <-> (intent id, document) for the reader (B20).
// Pure: no I/O, importable by the browser and the server alike.

/** The documents an intent can have, in tab order. */
export const DOCS = ['intent', 'spec', 'plan', 'review', 'konmari'];

const HASH_RE = /^#?i-(\d+)(?:-([\w-]+))?$/;

/**
 * `#i-87` -> { id: 87, doc: null }; `#i-87-review` -> { id: 87, doc: 'review' }.
 * An unknown doc name (`#i-87-bogus`) gives doc: null, so the caller falls back
 * to the first document that exists. Anything else (`#x`, '') gives null.
 */
export function parseHash(hash) {
  const m = HASH_RE.exec(String(hash ?? ''));
  if (!m) return null;
  const doc = m[2] && DOCS.includes(m[2]) ? m[2] : null;
  return { id: Number(m[1]), doc };
}

/** The hash for opening `doc` of intent `id`; with no (or an unknown) doc, just the intent. */
export function buildHash(id, doc) {
  return DOCS.includes(doc) ? `#i-${Number(id)}-${doc}` : `#i-${Number(id)}`;
}
