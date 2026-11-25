// The shape check in readQueue: every group key in the core's QUEUE_GROUPS must be an array.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from '../test/fixture-repo.mjs';
import { readQueue } from './repo.mjs';

const printing = (groups) => `console.log(JSON.stringify(${JSON.stringify(groups)}));\n`;
const all = { inFlight: [], queued: [], shipped: [], stopped: [], other: [] };

test('readQueue rejects a queue with no `other` group as "not a queue" (502)', async () => {
  const fx = createFixture();
  try {
    const { other, ...noOther } = all; // eslint-disable-line no-unused-vars
    fx.commit({ 'scripts/queue.mjs': printing(noOther) }, 'queue without other');
    await assert.rejects(readQueue(fx.dir), (e) => e.status === 502 && /not a queue/.test(e.message));
    fx.commit({ 'scripts/queue.mjs': printing(all) }, 'queue with all five');
    assert.deepEqual((await readQueue(fx.dir)).other, []);
  } finally {
    fx.cleanup();
  }
});
