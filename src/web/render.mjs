// The page's only Markdown-to-HTML path (B18), and its only HTML sink. The
// dependencies are passed in so the test runs this exact function, with this
// exact sanitiser configuration, under jsdom (AC10).

/** What DOMPurify keeps: plain HTML only, no style, no forms; its defaults already drop scripts, on* handlers and javascript: URLs. */
export const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style'],
};

/** GitHub-flavoured Markdown to sanitised HTML. `marked` and `DOMPurify` (an instance bound to a window) come from the caller. */
export function renderMarkdown(markdown, { marked, DOMPurify }) {
  const html = marked.parse(String(markdown ?? ''), { gfm: true, async: false });
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
