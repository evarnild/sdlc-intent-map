import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHash, DOCS, parseHash, pickDoc } from './hash.mjs';

describe('parseHash (AC9, B20)', () => {
  it('parses an intent alone', () => assert.deepEqual(parseHash('#i-87'), { id: 87, doc: null }));
  it('parses an intent and a document', () => assert.deepEqual(parseHash('#i-87-review'), { id: 87, doc: 'review' }));
  it('accepts konmari', () => assert.deepEqual(parseHash('#i-87-konmari'), { id: 87, doc: 'konmari' }));
  it('an unknown document keeps the intent and drops the doc', () => assert.deepEqual(parseHash('#i-87-bogus'), { id: 87, doc: null }));
  it('anything else is null', () => {
    for (const h of ['#x', '', '#', '#i-', '#i-abc', '#i--1', '#i-8 7', undefined, null]) assert.equal(parseHash(h), null, String(h));
  });
  it('is not fooled by a path-like doc', () => assert.equal(parseHash('#i-87-../x'), null));
});

describe('buildHash', () => {
  it('round-trips every document', () => {
    for (const d of DOCS) assert.deepEqual(parseHash(buildHash(5, d)), { id: 5, doc: d });
  });
  it('omits an unknown document', () => assert.equal(buildHash(5, 'nope'), '#i-5'));
});

describe('pickDoc (B20)', () => {
  const docs = { intent: 'i', spec: null, plan: 'p', review: null, konmari: null };
  it('keeps a wanted document that exists', () => assert.equal(pickDoc(docs, 'plan'), 'plan'));
  it('falls back to the first existing one when the wanted one is missing', () => assert.equal(pickDoc(docs, 'spec'), 'intent'));
  it('falls back to the first existing one when nothing is wanted', () => assert.equal(pickDoc(docs, null), 'intent'));
  it('falls back past a missing first document', () => assert.equal(pickDoc({ ...docs, intent: null }, null), 'plan'));
  it('is null for an intent with no documents', () => {
    const none = { intent: null, spec: null, plan: null, review: null, konmari: null };
    assert.equal(pickDoc(none, 'plan'), null);
    assert.equal(pickDoc(none, null), null);
    assert.equal(pickDoc({}, 'plan'), null);
  });
  it('ignores a wanted name that is not a document', () => assert.equal(pickDoc(docs, 'bogus'), 'intent'));
});
