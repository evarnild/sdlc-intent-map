import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHash, DOCS, parseHash } from './hash.mjs';

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
