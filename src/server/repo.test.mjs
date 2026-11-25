import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findInQueue } from './repo.mjs';

const empty = () => ({ inFlight: [], queued: [], shipped: [], stopped: [], other: [] });

for (const group of ['inFlight', 'queued', 'shipped', 'stopped', 'other']) {
  test(`findInQueue finds an intent in ${group}`, () => {
    const q = empty();
    q[group] = [{ id: 1, slug: 'a' }, { id: 7, slug: 'target' }];
    assert.deepEqual(findInQueue(q, 7), { id: 7, slug: 'target' });
  });
}

test('findInQueue finds an id in the last group when every earlier group is empty', () => {
  const q = empty();
  q.other = [{ id: 9, slug: 'last' }];
  assert.equal(findInQueue(q, 9).slug, 'last');
});

test('findInQueue returns the earlier group\'s record when an id is in two groups', () => {
  const q = empty();
  q.shipped = [{ id: 3, slug: 'shipped-one' }];
  q.queued = [{ id: 3, slug: 'queued-one' }];
  q.other = [{ id: 3, slug: 'other-one' }];
  assert.equal(findInQueue(q, 3).slug, 'queued-one');
});

test('findInQueue returns null for an id that is not present', () => {
  const q = empty();
  q.queued = [{ id: 1 }];
  assert.equal(findInQueue(q, 2), null);
});

test('findInQueue compares strictly: a string id does not match a numeric one', () => {
  const q = empty();
  q.queued = [{ id: 4 }];
  assert.equal(findInQueue(q, '4'), null);
});

test('findInQueue returns null on an empty queue', () => {
  assert.equal(findInQueue(empty(), 1), null);
});
