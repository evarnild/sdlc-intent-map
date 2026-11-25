import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY, layoutBoard, pickerGroups, SHIPPED_CAP, stateLine, truncate } from './layout.mjs';

const mk = (id, status, extra = {}) => ({
  id,
  slug: `s${id}`,
  title: `Intent ${id}`,
  type: 'feature',
  status,
  gates: '',
  auto: '',
  source: 'main',
  merged: null,
  blocked_by: [],
  blocked_by_open: [],
  ...extra,
});
const queue = (o = {}) => ({ inFlight: [], queued: [], shipped: [], stopped: [], other: [], problems: [], ...o });
const col = (b, key) => b.columns.find((c) => c.key === key);
const ids = (c) => c.counters.map((x) => x.id);
const counter = (b, id) => b.columns.flatMap((c) => c.counters).find((c) => c.id === id);

describe('columns (B11, AC7)', () => {
  const q = queue({
    inFlight: [mk(2, 'accepted'), mk(3, 'in-progress'), mk(4, 'in-review'), mk(5, 'accepted')],
    queued: [mk(6, 'draft'), mk(7, 'draft')],
    shipped: [100, 90, 80, 75, 74, 73, 72].map((i) => mk(i, 'done')),
    stopped: [mk(20, 'abandoned')],
  });
  const b = layoutBoard(q);
  it('puts each status in its column, in queue order', () => {
    assert.deepEqual(b.columns.map((c) => c.key), ['shipped', 'build', 'planned', 'draft']);
    assert.deepEqual(ids(col(b, 'build')), [3, 4]);
    assert.deepEqual(ids(col(b, 'planned')), [2, 5]);
    assert.deepEqual(ids(col(b, 'draft')), [6, 7]);
  });
  it('keeps only the first 5 shipped (I4)', () => {
    assert.equal(SHIPPED_CAP, 5);
    assert.deepEqual(ids(col(b, 'shipped')), [100, 90, 80, 75, 74]);
  });
  it('lists every shipped intent in order below (B16)', () => {
    assert.deepEqual(b.shipped.map((s) => s.id), [100, 90, 80, 75, 74, 73, 72]);
    assert.deepEqual(b.shipped[0], { id: 100, title: 'Intent 100', type: 'feature' });
  });
  it('omits stopped intents', () => assert.equal(counter(b, 20), undefined));
  it('shows Other only when non-empty', () => {
    assert.equal(col(b, 'other'), undefined);
    const b2 = layoutBoard(queue({ other: [mk(30, 'weird')] }));
    assert.deepEqual(ids(col(b2, 'other')), [30]);
    assert.equal(b2.columns.at(-1).key, 'other');
  });
  it('an empty queue still has its four columns', () => {
    assert.equal(layoutBoard(queue()).columns.length, 4);
  });
});

describe('stateLine (B12)', () => {
  it('joins status, gates, auto', () => {
    assert.equal(stateLine(mk(1, 'in-review', { gates: 'I·P', auto: 'auto · r1' })), 'IN-REVIEW · I·P · auto · r1');
  });
  it('adds BLOCKED last', () => {
    assert.equal(stateLine(mk(1, 'accepted', { gates: 'I·S·P', blocked_by_open: [3] })), 'ACCEPTED · I·S·P · BLOCKED');
  });
  it('leaves out empty parts', () => assert.equal(stateLine(mk(1, 'draft')), 'DRAFT'));
  it('appears on the counter', () => {
    const b = layoutBoard(queue({ inFlight: [mk(1, 'in-review', { gates: 'I·P', auto: 'auto · r1' })] }));
    assert.equal(counter(b, 1).stateLine, 'IN-REVIEW · I·P · auto · r1');
  });
});

describe('truncate', () => {
  it('cuts with an ellipsis and leaves short text alone', () => {
    assert.equal(truncate('short', 10), 'short');
    assert.equal(truncate('abcdefghij', 5), 'abcd…');
    assert.ok(truncate('x'.repeat(100), 24).length <= 24);
  });
  it('counters carry the cut label and the full title', () => {
    const long = 'A very long title that cannot fit in a counter';
    const b = layoutBoard(queue({ queued: [mk(1, 'draft', { title: long })] }));
    assert.ok(counter(b, 1).label.endsWith('…'));
    assert.equal(counter(b, 1).title, long);
  });
});

describe('arrows (B13, I5, AC8)', () => {
  it('draws an arrow for a direct open blocker, source to target, with the reason', () => {
    const q = queue({
      inFlight: [mk(3, 'in-progress'), mk(4, 'accepted', { blocked_by: [{ id: 3, reason: 'needs the API' }], blocked_by_open: [3] })],
    });
    const b = layoutBoard(q);
    assert.equal(b.arrows.length, 1);
    const a = b.arrows[0];
    const src = counter(b, 3);
    const dst = counter(b, 4);
    assert.equal(a.from, 3);
    assert.equal(a.to, 4);
    assert.equal(a.reason, 'needs the API');
    assert.equal(a.label, '§4 waits for §3: needs the API');
    // build column is left of planned: right edge of source to left edge of target
    assert.deepEqual([a.x1, a.y1], [src.x + src.w, src.y + src.h / 2]);
    assert.deepEqual([a.x2, a.y2], [dst.x, dst.y + dst.h / 2]);
    assert.match(a.d, /^M /);
    // the path the page draws starts on the source and ends on the target
    assert.ok(a.d.startsWith(`M ${a.x1} ${a.y1} `), a.d);
    assert.ok(a.d.endsWith(` ${a.x2} ${a.y2}`), a.d);
  });
  it('a blocker in a later column ends on the source left edge and target right edge', () => {
    const q = queue({
      inFlight: [mk(4, 'in-progress', { blocked_by: [{ id: 6, reason: 'r' }], blocked_by_open: [6] })],
      queued: [mk(6, 'draft')],
    });
    const b = layoutBoard(q);
    const src = counter(b, 6);
    const dst = counter(b, 4);
    assert.deepEqual([b.arrows[0].x1, b.arrows[0].x2], [src.x, dst.x + dst.w]);
  });
  it('same column: bottom of the upper to top of the lower, and the reverse', () => {
    const down = layoutBoard(queue({ queued: [mk(1, 'draft'), mk(2, 'draft', { blocked_by: [{ id: 1, reason: 'r' }], blocked_by_open: [1] })] }));
    const a = down.arrows[0];
    assert.equal(a.y1, counter(down, 1).y + GEOMETRY.counterH);
    assert.equal(a.y2, counter(down, 2).y);
    const up = layoutBoard(queue({ queued: [mk(1, 'draft', { blocked_by: [{ id: 2, reason: 'r' }], blocked_by_open: [2] }), mk(2, 'draft')] }));
    assert.equal(up.arrows[0].y1, counter(up, 2).y);
    assert.equal(up.arrows[0].y2, counter(up, 1).y + GEOMETRY.counterH);
    for (const a of [down.arrows[0], up.arrows[0]]) {
      assert.ok(a.d.startsWith(`M ${a.x1} ${a.y1} `), a.d);
      assert.ok(a.d.endsWith(` ${a.x2} ${a.y2}`), a.d);
    }
  });
  it('no arrow for a merged blocker (not open)', () => {
    const q = queue({ inFlight: [mk(4, 'accepted', { blocked_by: [{ id: 3, reason: 'r' }], blocked_by_open: [] })], shipped: [mk(3, 'done')] });
    assert.equal(layoutBoard(q).arrows.length, 0);
  });
  it('no arrow for a further (non-direct) blocker', () => {
    const q = queue({
      inFlight: [mk(3, 'in-progress'), mk(4, 'accepted', { blocked_by: [{ id: 3, reason: 'a' }], blocked_by_open: [3, 2] })],
      queued: [mk(2, 'draft')],
    });
    const b = layoutBoard(q);
    assert.deepEqual(b.arrows.map((a) => [a.from, a.to]), [[3, 4]]);
  });
  it('an off-board open blocker goes in the tooltip, not an arrow', () => {
    const q = queue({
      inFlight: [mk(4, 'accepted', { blocked_by: [{ id: 20, reason: 'needs it' }], blocked_by_open: [20] })],
      stopped: [mk(20, 'deferred')],
    });
    const b = layoutBoard(q);
    assert.equal(b.arrows.length, 0);
    assert.match(counter(b, 4).tooltip, /§20 \(not on the board\): needs it/);
  });
  it('a counter without off-board blockers has only its title as tooltip', () => {
    const b = layoutBoard(queue({ queued: [mk(1, 'draft')] }));
    assert.equal(counter(b, 1).tooltip, 'Intent 1');
  });
});

describe('determinism and shape (B14, B15)', () => {
  const q = queue({
    inFlight: [mk(3, 'in-progress'), mk(4, 'accepted', { blocked_by: [{ id: 3, reason: 'r' }], blocked_by_open: [3] })],
    queued: [mk(5, 'draft')],
    problems: ['blocked_by cycle: §1 -> §2 -> §1.'],
  });
  it('same input twice gives deep-equal output, and does not mutate the input', () => {
    const copy = structuredClone(q);
    assert.deepEqual(layoutBoard(q), layoutBoard(q));
    assert.deepEqual(q, copy);
  });
  it('passes problems through', () => assert.deepEqual(layoutBoard(q).problems, ['blocked_by cycle: §1 -> §2 -> §1.']));
  it('arrow endpoints lie on the edges of their counters', () => {
    const b = layoutBoard(q);
    for (const a of b.arrows) {
      const s = counter(b, a.from);
      const t = counter(b, a.to);
      const onEdge = (c, x, y) => (x === c.x || x === c.x + c.w ? y >= c.y && y <= c.y + c.h : y === c.y || y === c.y + c.h ? x >= c.x && x <= c.x + c.w : false);
      assert.ok(onEdge(s, a.x1, a.y1));
      assert.ok(onEdge(t, a.x2, a.y2));
    }
  });
  it('counters sit inside the board and do not overlap', () => {
    const b = layoutBoard(q);
    const cs = b.columns.flatMap((c) => c.counters);
    for (const c of cs) assert.ok(c.x + c.w <= b.width && c.y + c.h <= b.height);
    for (const a of cs) for (const o of cs) if (a !== o) assert.ok(a.x + a.w <= o.x || o.x + o.w <= a.x || a.y + a.h <= o.y || o.y + o.h <= a.y);
  });
});

describe('pickerGroups (B19)', () => {
  it('groups as the queue does and omits empty groups', () => {
    const g = pickerGroups(queue({ inFlight: [mk(1, 'accepted')], stopped: [mk(2, 'deferred')] }));
    assert.deepEqual(g.map((x) => x.key), ['inFlight', 'stopped']);
    assert.deepEqual(g[1].items, [{ id: 2, title: 'Intent 2', status: 'deferred' }]);
  });
});
