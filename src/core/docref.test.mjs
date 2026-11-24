import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chooseFolder, chooseRef } from './docref.mjs';

describe('chooseRef (I3)', () => {
  it('branch source with a branch reads the branch', () => {
    assert.deepEqual(chooseRef('branch', 'feat/1-x'), { ref: 'feat/1-x', from: 'branch' });
  });
  it('main source reads main even when a branch exists', () => {
    assert.deepEqual(chooseRef('main', 'feat/1-x'), { ref: 'main', from: 'main' });
  });
  it('a branch conflict reads main', () => {
    assert.deepEqual(chooseRef('branch conflict', null), { ref: 'main', from: 'main' });
    assert.deepEqual(chooseRef('branch conflict', 'feat/1-x'), { ref: 'main', from: 'main' });
  });
  it('branch source with no branch found falls back to main', () => {
    assert.deepEqual(chooseRef('branch', null), { ref: 'main', from: 'main' });
  });
});

describe('chooseFolder (B7)', () => {
  it('matches the id prefix exactly, not 10- for 1', () => {
    assert.equal(chooseFolder(1, ['10-other', '1-first', '11-x']), '1-first');
  });
  it('is null when absent', () => assert.equal(chooseFolder(2, ['1-a']), null));
});
