// The page (B10-B21): fetches the API, draws the board from core/layout.mjs,
// runs the reader, the picker and the URL hash. It only presents: the layout,
// hash and ref rules are src/core. Every URL here is same-origin (B22).
import { marked } from '/vendor/marked.js';
import DOMPurify from '/vendor/purify.js';
import { buildHash, DOCS, parseHash } from '/core/hash.mjs';
import { layoutBoard, pickerGroups } from '/core/layout.mjs';
import { renderMarkdown } from '/web/render.mjs';

const SVG = 'http://www.w3.org/2000/svg';
const DOC_LABEL = { intent: 'Intent', spec: 'Spec', plan: 'Plan', review: 'Review', konmari: 'KonMari' };
const $ = (id) => document.getElementById(id);

let selected = null; // { id, doc }
let openSeq = 0; // a later open wins over a slower earlier one

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

async function getJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // not JSON: reported below
  }
  return { ok: res.ok, status: res.status, body };
}

function showError(text) {
  const box = $('error');
  box.textContent = text;
  box.hidden = !text;
}

/** Makes a non-button element act as one: Enter and Space activate it. */
function activatable(node, label, onActivate) {
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-label', label);
  node.addEventListener('click', onActivate);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  });
}

function drawHeader(queue) {
  $('hdr-repo').textContent = queue.repo;
  $('hdr-main').textContent = `main ${queue.main}`;
  $('hdr-at').textContent = `read ${new Date(queue.at).toLocaleString()}`;
}

function drawBoard(board) {
  const root = $('board');
  root.replaceChildren();
  root.style.width = `${board.width}px`;
  root.style.height = `${board.height}px`;
  for (const col of board.columns) {
    root.append(el('h3', { class: 'col-title', text: col.title, style: `left:${col.x}px;top:20px;width:${col.w}px` }));
    for (const c of col.counters) {
      const node = el(
        'div',
        { class: `counter tone-${c.tone}`, 'data-id': String(c.id), title: c.tooltip, style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px` },
        el('span', { class: 'head' }, el('span', { class: 'id', text: `§${c.id}` }), el('span', { class: 'title', text: c.label })),
        el('span', { class: 'state', text: c.stateLine }),
      );
      activatable(node, `§${c.id} ${c.title}, ${c.stateLine}`, () => openIntent(c.id, null));
      root.append(node);
    }
  }
  const layer = svg('svg', { id: 'arrows', width: board.width, height: board.height, viewBox: `0 0 ${board.width} ${board.height}` });
  const defs = svg('defs');
  const marker = svg('marker', { id: 'head', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '8', markerHeight: '8', orient: 'auto-start-reverse' });
  marker.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'arrowhead' }));
  defs.append(marker);
  layer.append(defs);
  for (const a of board.arrows) {
    const g = svg('g', { tabindex: '0', 'aria-label': a.label });
    g.style.pointerEvents = 'auto';
    g.append(svg('title'), svg('path', { d: a.d, class: 'hit' }), svg('path', { d: a.d, class: 'arrow', 'marker-end': 'url(#head)' }));
    g.firstChild.textContent = a.label;
    layer.append(g);
  }
  root.append(layer);

  const problems = $('problems');
  problems.replaceChildren(...board.problems.map((p) => el('li', { text: p })));
  problems.hidden = board.problems.length === 0;

  const shipped = $('shipped');
  shipped.replaceChildren(
    ...board.shipped.map((s) => {
      const btn = el('button', { type: 'button', 'data-id': String(s.id) }, el('span', { class: 'id', text: `§${s.id}` }), el('span', { text: s.title }), el('span', { class: 'type', text: s.type ?? '' }));
      btn.addEventListener('click', () => openIntent(s.id, null));
      return el('li', {}, btn);
    }),
  );
}

function drawPicker(queue) {
  const picker = $('picker');
  picker.replaceChildren(el('option', { value: '', text: 'Choose an intent…' }));
  for (const g of pickerGroups(queue)) {
    picker.append(el('optgroup', { label: g.title }, ...g.items.map((i) => el('option', { value: String(i.id), text: `§${i.id} ${i.title} (${i.status})` }))));
  }
  picker.onchange = () => picker.value && openIntent(Number(picker.value), null);
}

function markSelected() {
  const id = selected ? String(selected.id) : null;
  for (const node of document.querySelectorAll('#board .counter, #shipped button')) node.classList.toggle('selected', node.dataset.id === id);
  $('picker').value = id ?? '';
}

function drawTabs(data, doc) {
  const tabs = $('tabs');
  tabs.replaceChildren(
    ...DOCS.map((d) => {
      const btn = el('button', { type: 'button', role: 'tab', id: `tab-${d}`, text: DOC_LABEL[d], 'aria-selected': String(d === doc), tabindex: d === doc ? '0' : '-1' });
      btn.disabled = data.documents[d] === null;
      btn.addEventListener('click', () => showDoc(data, d));
      return btn;
    }),
  );
}

function showDoc(data, doc) {
  selected = { id: data.id, doc };
  drawTabs(data, doc);
  $('doc').setAttribute('aria-labelledby', `tab-${doc}`);
  // B18: the one HTML sink, always through the sanitiser.
  $('doc').innerHTML = doc ? renderMarkdown(data.documents[doc], { marked, DOMPurify }) : '';
  history.replaceState(null, '', buildHash(data.id, doc)); // B20: replaceState does not fire hashchange
  markSelected();
}

function drawReader(data, doc) {
  const m = data.intent;
  $('reader-missing').hidden = true;
  $('reader').hidden = false;
  $('reader-title').textContent = `§${data.id} ${m.title ?? m.slug ?? ''}`;
  $('reader-meta').textContent = [m.type, m.status, m.gates, m.auto, `read from ${data.ref}`].filter(Boolean).join(' · ');
  const open = new Set(m.blocked_by_open ?? []);
  $('reader-blockers').replaceChildren(
    ...(m.blocked_by ?? []).map((b) => el('li', {}, `Blocked by §${b.id}: ${b.reason || '(no reason)'} `, el('span', { class: open.has(b.id) ? 'open' : '', text: open.has(b.id) ? '(still open)' : '(merged)' }))),
  );
  showDoc(data, doc);
}

function keyboardTabs(e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...$('tabs').querySelectorAll('button:not(:disabled)')];
  const at = tabs.indexOf(document.activeElement);
  if (at < 0) return;
  e.preventDefault();
  const next = tabs[(at + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.click();
  $('tabs').querySelector(`#${next.id}`).focus();
}

/** Opens intent `id`; `doc` is the wanted document, or null for the first one that exists (B20). */
async function openIntent(id, doc) {
  const seq = ++openSeq;
  const { ok, status, body } = await getJson(`/api/intent/${id}`);
  if (seq !== openSeq) return;
  if (!ok) {
    $('reader').hidden = true;
    selected = null;
    markSelected();
    const missing = $('reader-missing');
    missing.hidden = false;
    missing.textContent = status === 404 ? `No intent §${id} in this repo` : `Could not read §${id}: ${body?.error ?? `HTTP ${status}`}`;
    return;
  }
  const wanted = doc && body.documents[doc] !== null ? doc : DOCS.find((d) => body.documents[d] !== null) ?? null;
  drawReader(body, wanted);
}

function openFromHash() {
  const h = parseHash(location.hash);
  if (h && !(selected && selected.id === h.id && selected.doc === h.doc)) openIntent(h.id, h.doc);
}

async function load() {
  const { ok, body } = await getJson('/api/queue');
  if (!ok || !body || body.error) {
    showError(body?.error ?? 'Could not read the queue.');
    $('board-section').hidden = true;
    return;
  }
  showError('');
  drawHeader(body);
  drawBoard(layoutBoard(body));
  drawPicker(body);
  openFromHash();
}

$('tabs').addEventListener('keydown', keyboardTabs);
window.addEventListener('hashchange', openFromHash);
load();
