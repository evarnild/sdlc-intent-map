// The queue's five groups, in the order the picker lists them and the lookup
// searches them: one home for the list (docs/architecture.md, principle 4).
// The titles are the page's own wording; they repeat scripts/queue-lib.mjs
// (a recorded exception, docs/architecture.md).

export const GROUPS = [
  { key: 'inFlight', title: 'In flight' },
  { key: 'queued', title: 'Queued' },
  { key: 'shipped', title: 'Shipped' },
  { key: 'stopped', title: 'Stopped' },
  { key: 'other', title: 'Other' },
];

export const QUEUE_GROUPS = GROUPS.map((g) => g.key);

/** The queue's record of intent `id`, or null. The first group that holds it wins. */
export function findInQueue(queue, id) {
  for (const g of QUEUE_GROUPS) {
    const hit = queue[g].find((i) => i.id === id);
    if (hit) return hit;
  }
  return null;
}
