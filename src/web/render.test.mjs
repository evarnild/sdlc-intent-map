// AC10 (B18): the real marked and DOMPurify, under jsdom, with the page's own
// renderMarkdown and configuration.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { marked } from 'marked';
import { renderMarkdown } from './render.mjs';

const DOMPurify = createDOMPurify(new JSDOM('').window);
const render = (md) => renderMarkdown(md, { marked, DOMPurify });
const dom = (html) => new JSDOM(`<body>${html}</body>`).window.document;

describe('renderMarkdown (AC10, B18)', () => {
  it('removes <script>', () => {
    const html = render('hello\n\n<script>alert(1)</script>\n\nworld');
    assert.ok(!/script/i.test(html), html);
    assert.match(html, /hello/);
    assert.match(html, /world/);
  });

  it('removes event-handler attributes', () => {
    const html = render('<img src="x" onerror="alert(1)">\n\n<a href="/a" onclick="alert(1)">a</a>');
    assert.ok(!/onerror|onclick|alert/i.test(html), html);
  });

  it('removes javascript: URLs from Markdown and HTML links, in any case', () => {
    for (const md of ['[x](javascript:alert(1))', '[x](JaVaScRiPt:alert(1))', '<a href="javascript:alert(1)">x</a>', '[x](&#106;avascript:alert(1))']) {
      const doc = dom(render(md));
      for (const a of doc.querySelectorAll('a')) assert.ok(!/^\s*javascript:/i.test(a.getAttribute('href') ?? ''), md);
      assert.ok(!/javascript:/i.test(render(md)), md);
    }
  });

  it('removes style, iframes and forms', () => {
    const html = render('<style>body{display:none}</style><iframe src="/x"></iframe><form action="/x"><input></form><p style="color:red">p</p>');
    assert.ok(!/<style|<iframe|<form|<input|style=/i.test(html), html);
    assert.match(html, /<p>p<\/p>/);
  });

  it('keeps a GFM table, fenced code and a plain link', () => {
    const html = render('| a | b |\n| - | - |\n| 1 | 2 |\n\n```js\nconst x = 1;\n```\n\n[ok](https://example.org/p)');
    const doc = dom(html);
    assert.equal(doc.querySelectorAll('table th').length, 2);
    assert.equal(doc.querySelectorAll('table td').length, 2);
    assert.ok(doc.querySelector('pre code'));
    assert.equal(doc.querySelector('a').getAttribute('href'), 'https://example.org/p');
  });

  it('renders null and empty input as empty', () => {
    assert.equal(render(null).trim(), '');
    assert.equal(render('').trim(), '');
  });
});
