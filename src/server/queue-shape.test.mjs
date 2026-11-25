// The shape check in readQueue: every group key in the core's QUEUE_GROUPS must be an array.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUEUE_GROUPS } from '../core/queue.mjs';
import { createFixture } from '../test/fixture-repo.mjs';
import { readQueue } from './repo.mjs';

const printing = (groups) => `console.log(JSON.stringify(${JSON.stringify(groups)}));\n`;
const all = { inFlight: [], queued: [], shipped: [], stopped: [], other: [] };

test('readQueue rejects a queue missing any one group as "not a queue" (502), and accepts all five', async () => {
  const fx = createFixture();
  try {
    for (const key of QUEUE_GROUPS) {
      const without = Object.fromEntries(Object.entries(all).filter(([k]) => k !== key));
      fx.commit({ 'scripts/queue.mjs': printing(without) }, `queue without ${key}`);
      await assert.rejects(
        readQueue(fx.dir),
        (e) => e.status === 502 && /not a queue/.test(e.message),
        `a queue without ${key} must be rejected`,
      );
    }
    fx.commit({ 'scripts/queue.mjs': printing(all) }, 'queue with all five');
    assert.deepEqual((await readQueue(fx.dir)).other, []);
  } finally {
    fx.cleanup();
  }
});
