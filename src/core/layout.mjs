// The board, computed from the queue's JSON alone (B11-B16). Pure and
// deterministic: the same queue always gives the same layout (B14), so the
// tests can assert positions and arrow endpoints by id.

export const GEOMETRY = {
  pad: 20, // around the board
  headerH: 34, // column title
  colW: 220,
  colGap: 70, // room between columns for arrows
  counterH: 64,
  rowGap: 18,
};

/** Recently shipped keeps this many counters (I4: the artifact held 5; all of them are in the list below). */
export const SHIPPED_CAP = 5;
const TITLE_MAX = 24;

const COLUMNS = [
  { key: 'shipped', title: 'Recently shipped', tone: 'shipped' },
  { key: 'build', title: 'Build · review', tone: 'build' },
  { key: 'planned', title: 'Planned · waiting', tone: 'planned' },
  { key: 'draft', title: 'Drafts', tone: 'draft' },
  { key: 'other', title: 'Other', tone: 'other' },
];

/** `text` cut with an ellipsis to at most `max` characters. */
export function truncate(text, max) {
  const s = String(text ?? '');
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** B12: STATUS · gates · auto · BLOCKED, leaving out what is empty. */
export function stateLine(intent) {
  const parts = [String(intent.status ?? '?').toUpperCase()];
  if (intent.gates) parts.push(intent.gates);
  if (intent.auto) parts.push(intent.auto);
  if ((intent.blocked_by_open ?? []).length) parts.push('BLOCKED');
  return parts.join(' · ');
}

/** The queue's groups as the picker lists them (B19), empty groups omitted. */
export function pickerGroups(queue) {
  const groups = [
    ['inFlight', 'In flight'],
    ['queued', 'Queued'],
    ['shipped', 'Shipped'],
    ['stopped', 'Stopped'],
    ['other', 'Other'],
  ];
  return groups
    .map(([key, title]) => ({ key, title, items: (queue[key] ?? []).map((i) => ({ id: i.id, title: i.title ?? i.slug ?? '', status: i.status })) }))
    .filter((g) => g.items.length);
}

/**
 * Queue JSON -> { columns, arrows, problems, shipped, width, height }.
 * Counters: { id, label, title, stateLine, status, tone, tooltip, x, y, w, h }.
 * Arrows: { from, to, reason, label, x1, y1, x2, y2, d } with endpoints on the
 * counters' edges (I6: crossings are allowed; the endpoints are always right).
 */
export function layoutBoard(queue) {
  const G = GEOMETRY;
  const inFlight = queue.inFlight ?? [];
  const members = {
    shipped: (queue.shipped ?? []).slice(0, SHIPPED_CAP),
    build: inFlight.filter((i) => i.status === 'in-progress' || i.status === 'in-review'),
    planned: inFlight.filter((i) => i.status === 'accepted'),
    draft: queue.queued ?? [],
    other: queue.other ?? [],
  };
  const shown = COLUMNS.filter((c) => c.key !== 'other' || members.other.length);
  const counters = new Map();
  const intents = new Map();
  const columns = shown.map((col, ci) => {
    const x = G.pad + ci * (G.colW + G.colGap);
    const list = members[col.key].map((i, row) => {
      const c = {
        id: i.id,
        label: truncate(i.title ?? i.slug ?? '', TITLE_MAX),
        title: i.title ?? i.slug ?? '',
        stateLine: stateLine(i),
        status: i.status,
        tone: col.tone,
        tooltip: '',
        x,
        y: G.pad + G.headerH + row * (G.counterH + G.rowGap),
        w: G.colW,
        h: G.counterH,
      };
      counters.set(i.id, c);
      intents.set(i.id, i);
      return c;
    });
    return { key: col.key, title: col.title, tone: col.tone, x, w: G.colW, counters: list };
  });

  // B13 / I5: an arrow for each open, direct blocker (in blocked_by_open AND
  // in blocked_by) that is on the board too. blocked_by_open also holds
  // further (indirect) blockers and those get no arrow; merged blockers are not
  // open. An open direct blocker that is off the board goes in the tooltip.
  const arrows = [];
  for (const col of columns) {
    for (const c of col.counters) {
      const intent = intents.get(c.id);
      const open = new Set(intent.blocked_by_open ?? []);
      const tips = [];
      for (const b of intent.blocked_by ?? []) {
        if (!open.has(b.id)) continue;
        const src = counters.get(b.id);
        if (src && src.id !== c.id) arrows.push(arrow(src, c, b.reason));
        else if (!src) tips.push(`Waits for §${b.id} (not on the board): ${b.reason}`);
      }
      c.tooltip = [c.title, ...tips].join('\n');
    }
  }

  const rows = Math.max(1, ...columns.map((c) => c.counters.length));
  const width = G.pad * 2 + columns.length * G.colW + (columns.length - 1) * G.colGap;
  const height = G.pad * 2 + G.headerH + rows * G.counterH + (rows - 1) * G.rowGap;
  return {
    columns,
    arrows,
    problems: [...(queue.problems ?? [])],
    shipped: (queue.shipped ?? []).map((i) => ({ id: i.id, title: i.title ?? i.slug ?? '', type: i.type })),
    width,
    height,
  };
}

/** One arrow from the blocker's counter to the blocked one, ending on the counters' edges. */
function arrow(src, dst, reason) {
  let x1, y1, x2, y2;
  if (src.x < dst.x) {
    [x1, y1, x2, y2] = [src.x + src.w, src.y + src.h / 2, dst.x, dst.y + dst.h / 2];
  } else if (src.x > dst.x) {
    [x1, y1, x2, y2] = [src.x, src.y + src.h / 2, dst.x + dst.w, dst.y + dst.h / 2];
  } else if (src.y < dst.y) {
    [x1, y1, x2, y2] = [src.x + src.w / 2, src.y + src.h, dst.x + dst.w / 2, dst.y];
  } else {
    [x1, y1, x2, y2] = [src.x + src.w / 2, src.y, dst.x + dst.w / 2, dst.y + dst.h];
  }
  const horizontal = src.x !== dst.x;
  const k = Math.abs(x2 - x1) / 2;
  const dir = Math.sign(x2 - x1);
  const d = horizontal
    ? `M ${x1} ${y1} C ${x1 + dir * k} ${y1}, ${x2 - dir * k} ${y2}, ${x2} ${y2}`
    : `M ${x1} ${y1} L ${x2} ${y2}`;
  return { from: src.id, to: dst.id, reason, label: `§${dst.id} waits for §${src.id}: ${reason}`, x1, y1, x2, y2, d };
}
