import { parseDocument } from "htmlparser2";
import {
  Element as DomElement,
  Text as DomText,
  Document as DomDocument,
} from "domhandler";
import { render as serializeDom } from "dom-serializer";
import { sanitizeArticleHtml } from "#utils/htmlSanitizer.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Draft Formatter — Requirement 4 (backend portion)
 * ============================================================
 *
 *  Public API:
 *      formatDraftHtml({ paragraphs }) -> { contentHtml, paragraphs }
 *
 *  Pipeline per paragraph:
 *      1. sanitizeArticleHtml(p.html)              (existing)
 *      2. Normalization pass (DOM-based, idempotent):
 *         - wrap top-level text/inline sequences in <p>
 *         - drop a single <br> sitting alone between two block paragraphs
 *         - wrap direct text-node children of <ol>/<ul> in <li>
 *         - add `article-anchor` class to every <a> (preserve existing tokens)
 *         - ensure rel="nofollow noopener" on every <a> (preserve existing tokens)
 *         - drop whitespace-only text nodes between adjacent <p> siblings
 *         - add class tokens: article-h2 / article-h3 / article-p / article-list /
 *           article-quote on the corresponding elements (additive)
 *      3. Compute optional `displayHints` per paragraph
 *
 *  Properties (see design.md):
 *    - Idempotent: format(format(x)) === format(x)             (Property 5 / Req 4.4)
 *    - No `style` attributes added by the formatter             (Property 6 / Req 4.5)
 *    - On internal exception: return sanitized output unmodified
 *      and paragraphs[] in pre-feature shape with no displayHints (Req 4.6)
 *
 *  This module does **not** wire into draftService — that is task 11.2.
 */

export const DRAFT_FORMAT_VERSION = "v1";

/* ─────────────────────────── tag taxonomy ─────────────────────────── */

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

// `<br>` is not in our allowlist (htmlSanitizer drops it), but we still handle
// it idempotently in case an upstream caller bypasses the sanitizer.
const INLINE_TAGS = new Set(["a", "strong", "em", "code", "sup", "br", "span"]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/* ───────────────────────── DOM helpers ────────────────────────────── */

const isElement = (n) => n instanceof DomElement;
const isText = (n) => n instanceof DomText;

const isWhitespaceOnlyText = (n) =>
  isText(n) && /^[\s\u00A0]*$/.test(n.data || "");

const isInlineNode = (n) => {
  if (isText(n)) return true;
  if (!isElement(n)) return false;
  return INLINE_TAGS.has(n.name);
};

const isBlockElement = (n) => isElement(n) && BLOCK_TAGS.has(n.name);

/**
 * domhandler's helper: re-link prev/next sibling pointers and parent.children
 * when we splice a node out or replace it.
 */
const detachNode = (node) => {
  const parent = node.parent;
  if (parent) {
    const idx = parent.children.indexOf(node);
    if (idx >= 0) parent.children.splice(idx, 1);
  }
  if (node.prev) node.prev.next = node.next;
  if (node.next) node.next.prev = node.prev;
  node.parent = null;
  node.prev = null;
  node.next = null;
};

const replaceNode = (oldNode, newNode) => {
  const parent = oldNode.parent;
  if (!parent) return;
  const idx = parent.children.indexOf(oldNode);
  if (idx < 0) return;
  parent.children[idx] = newNode;
  newNode.parent = parent;
  newNode.prev = oldNode.prev;
  newNode.next = oldNode.next;
  if (oldNode.prev) oldNode.prev.next = newNode;
  if (oldNode.next) oldNode.next.prev = newNode;
  oldNode.parent = null;
  oldNode.prev = null;
  oldNode.next = null;
};

/**
 * Insert `newNode` into `parent.children` at `index` and stitch
 * the prev/next pointers of its (new) neighbors.
 */
const insertChildAt = (parent, index, newNode) => {
  const clamped = Math.max(0, Math.min(index, parent.children.length));
  const before = parent.children[clamped - 1] || null;
  const after = parent.children[clamped] || null;
  parent.children.splice(clamped, 0, newNode);
  newNode.parent = parent;
  newNode.prev = before;
  newNode.next = after;
  if (before) before.next = newNode;
  if (after) after.prev = newNode;
};

/**
 * Build a new <li> wrapping the supplied children. Children are
 * detached from their previous parent first.
 */
const buildElement = (name, attribs, children = []) => {
  const el = new DomElement(name, { ...(attribs || {}) }, []);
  for (const child of children) {
    detachNode(child);
    el.children.push(child);
    child.parent = el;
  }
  // Re-stitch sibling pointers inside the new element.
  for (let i = 0; i < el.children.length; i++) {
    el.children[i].prev = el.children[i - 1] || null;
    el.children[i].next = el.children[i + 1] || null;
  }
  return el;
};

/* ───────────────────────── token utilities ────────────────────────── */

const tokenSet = (raw) => {
  const tokens = String(raw || "")
    .split(/\s+/)
    .filter(Boolean);
  return tokens;
};

const addToken = (current, token) => {
  const tokens = tokenSet(current);
  if (!tokens.includes(token)) tokens.push(token);
  return tokens.join(" ");
};

const ensureRelTokens = (current) => {
  const tokens = tokenSet(current);
  for (const required of ["nofollow", "noopener"]) {
    if (!tokens.includes(required)) tokens.push(required);
  }
  return tokens.join(" ");
};

/* ───────────────────────── normalization passes ───────────────────── */

/**
 * Pass A: wrap any top-level run of inline/text nodes (children of the
 * synthetic Document root) into a single <p>.
 *
 * sanitizeArticleHtml is generally well-formed at the block level, but
 * upstream LLM output can include bare text or stray inline runs. We
 * group consecutive inline-or-text siblings into one <p> so the document
 * is a clean sequence of block-level children.
 */
const wrapTopLevelInlineRuns = (root) => {
  const children = root.children;
  let i = 0;
  while (i < children.length) {
    const node = children[i];
    // Skip whitespace-only text nodes between blocks — pass D removes them.
    if (isWhitespaceOnlyText(node)) {
      i += 1;
      continue;
    }
    if (isBlockElement(node)) {
      i += 1;
      continue;
    }
    if (!isInlineNode(node)) {
      // Unknown / non-inline / non-block (e.g. a comment) — leave alone.
      i += 1;
      continue;
    }

    // Collect a run of inline/text/whitespace nodes terminating at next
    // block or end-of-list.
    const run = [];
    let j = i;
    while (j < children.length && !isBlockElement(children[j])) {
      run.push(children[j]);
      j += 1;
    }

    // If the run is purely whitespace, leave it (pass D will drop it).
    const hasContent = run.some(
      (n) => !isWhitespaceOnlyText(n) && (isElement(n) || (isText(n) && n.data.trim()))
    );
    if (!hasContent) {
      i = j;
      continue;
    }

    const wrapper = buildElement("p", {}, run);
    // Splice the run out and put the wrapper in its place.
    // After detachNode-ing each child via buildElement, the run is gone
    // from `children`, so we need to insert at the original index.
    insertChildAt(root, i, wrapper);
    // Continue past the wrapper (which now occupies index i).
    i += 1;
  }
};

/**
 * Pass B: drop a single <br> element occurring as the sole content
 * between two adjacent paragraph blocks, anywhere in the tree.
 */
const stripBetweenParagraphBreaks = (node) => {
  if (!isElement(node) && !(node instanceof DomDocument)) return;
  const children = node.children || [];
  // Walk children backwards so splices don't disturb indices we haven't
  // processed yet.
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (
      isElement(child) &&
      child.name === "br" &&
      isElement(child.prev) &&
      child.prev.name === "p" &&
      isElement(child.next) &&
      child.next.name === "p"
    ) {
      detachNode(child);
    }
  }
  for (const child of [...children]) stripBetweenParagraphBreaks(child);
};

/**
 * Pass C: wrap any direct text-node child of <ol>/<ul> in a <li>.
 * Whitespace-only text nodes are dropped instead of wrapped.
 */
const wrapListTextChildren = (node) => {
  if (!isElement(node) && !(node instanceof DomDocument)) return;
  const isList = isElement(node) && (node.name === "ol" || node.name === "ul");
  if (isList) {
    const children = [...node.children];
    for (const child of children) {
      if (isText(child)) {
        if (isWhitespaceOnlyText(child)) {
          detachNode(child);
          continue;
        }
        const idx = node.children.indexOf(child);
        const li = buildElement("li", {}, [child]);
        // buildElement detached the child; re-insert li at idx.
        insertChildAt(node, idx, li);
      }
    }
  }
  for (const child of [...(node.children || [])]) wrapListTextChildren(child);
};

/**
 * Pass D: drop whitespace-only text nodes that sit between two adjacent
 * <p> siblings, anywhere in the tree.
 */
const stripWhitespaceBetweenParagraphs = (node) => {
  if (!isElement(node) && !(node instanceof DomDocument)) return;
  const children = node.children || [];
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (
      isWhitespaceOnlyText(child) &&
      isElement(child.prev) &&
      child.prev.name === "p" &&
      isElement(child.next) &&
      child.next.name === "p"
    ) {
      detachNode(child);
    }
  }
  for (const child of [...children]) stripWhitespaceBetweenParagraphs(child);
};

/**
 * Pass E: enrich every element in-place:
 *   - <a>:    add `article-anchor` class, ensure rel="nofollow noopener"
 *   - <h2>:   add `article-h2`
 *   - <h3>:   add `article-h3`
 *   - <p>:    add `article-p`
 *   - <ul>:   add `article-list`
 *   - <ol>:   add `article-list`
 *   - <blockquote>: add `article-quote`
 *
 * All additions preserve existing class / rel tokens — duplicates are not
 * appended (idempotency).
 */
const enrichElement = (el) => {
  if (!isElement(el)) return;
  const attribs = el.attribs || (el.attribs = {});
  switch (el.name) {
    case "a":
      attribs.class = addToken(attribs.class, "article-anchor");
      attribs.rel = ensureRelTokens(attribs.rel);
      break;
    case "h2":
      attribs.class = addToken(attribs.class, "article-h2");
      break;
    case "h3":
      attribs.class = addToken(attribs.class, "article-h3");
      break;
    case "p":
      attribs.class = addToken(attribs.class, "article-p");
      break;
    case "ul":
    case "ol":
      attribs.class = addToken(attribs.class, "article-list");
      break;
    case "blockquote":
      attribs.class = addToken(attribs.class, "article-quote");
      break;
    default:
      break;
  }
};

const walkAndEnrich = (node) => {
  if (isElement(node)) enrichElement(node);
  for (const child of node.children || []) walkAndEnrich(child);
};

/* ───────────────────────── displayHints ───────────────────────────── */

/**
 * Determine the leading heading level (2 or 3) if the paragraph's
 * normalized HTML begins with an <h2> or <h3>. Returns null otherwise.
 */
const detectLeadingHeading = (root) => {
  for (const child of root.children) {
    if (isWhitespaceOnlyText(child)) continue;
    if (isElement(child)) {
      if (child.name === "h2") return 2;
      if (child.name === "h3") return 3;
      return null;
    }
    return null;
  }
  return null;
};

const containsTag = (root, name) => {
  if (isElement(root) && root.name === name) return true;
  for (const child of root.children || []) {
    if (containsTag(child, name)) return true;
  }
  return false;
};

const computeDisplayHints = (root, { isFirstParagraph }) => {
  const hints = {};
  const lead = detectLeadingHeading(root);
  if (lead === 2 || lead === 3) hints.leadingHeadingLevel = lead;
  if (isFirstParagraph) hints.isOpening = true;
  let listKind = null;
  if (containsTag(root, "ul")) listKind = "bullet";
  else if (containsTag(root, "ol")) listKind = "ordered";
  if (listKind !== null) hints.listKind = listKind;
  if (containsTag(root, "blockquote")) hints.blockquote = true;
  return hints;
};

/* ───────────────────────── orchestration ──────────────────────────── */

/**
 * Run the full normalization pipeline on a single sanitized HTML string
 * and return both the formatted HTML and the computed displayHints.
 */
const normalizeOneParagraph = (sanitizedHtml, { isFirstParagraph }) => {
  // domhandler's parseDocument returns a Document whose `children` are
  // the top-level nodes. The Document itself isn't an Element so the
  // various helpers special-case it.
  const doc = parseDocument(sanitizedHtml, { decodeEntities: true });
  wrapTopLevelInlineRuns(doc);
  stripBetweenParagraphBreaks(doc);
  wrapListTextChildren(doc);
  stripWhitespaceBetweenParagraphs(doc);
  walkAndEnrich(doc);
  const formattedHtml = serializeDom(doc, { decodeEntities: true });
  const displayHints = computeDisplayHints(doc, { isFirstParagraph });
  return { formattedHtml, displayHints };
};

/**
 * Build the fallback shape used when normalization throws: each paragraph
 * carries the sanitized html (no normalization), no displayHints, and the
 * surrounding fields preserved verbatim from the input.
 */
const buildFallback = (paragraphs) => {
  const safe = (paragraphs || []).map((p) => {
    const sanitized = sanitizeArticleHtml(p?.html ?? "");
    const { displayHints: _omit, ...rest } = p || {};
    return { ...rest, html: sanitized };
  });
  const contentHtml = safe.map((p) => p.html).join("\n");
  return { contentHtml, paragraphs: safe };
};

/* ───────────────────────────── public API ─────────────────────────── */

/**
 * Format a draft's paragraphs[] into render-friendly semantic HTML.
 *
 * Input:
 *   { paragraphs: [{ id?, html, markdown?, tag, citations[], wordCount, ... }] }
 *
 * Output:
 *   {
 *     contentHtml: string,                     // joined formatted HTML
 *     paragraphs:  [{ ...all-input-fields, html, displayHints? }]
 *   }
 *
 * On any internal exception in the normalization pass, the function returns
 * the unmodified output of `sanitizeArticleHtml` for each paragraph and
 * omits `displayHints` entirely (Requirement 4.6).
 */
export const formatDraftHtml = ({ paragraphs } = {}) => {
  const input = Array.isArray(paragraphs) ? paragraphs : [];
  if (input.length === 0) {
    return { contentHtml: "", paragraphs: [] };
  }

  try {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const p = input[i] || {};
      const sanitized = sanitizeArticleHtml(p.html ?? "");
      const { formattedHtml, displayHints } = normalizeOneParagraph(sanitized, {
        isFirstParagraph: i === 0,
      });

      // Preserve every input field; overwrite html and (re)write displayHints.
      // Strip any stale displayHints from prior runs first so idempotency is
      // a function of the new HTML, not the prior hints.
      const { displayHints: _stale, ...rest } = p;
      const next = { ...rest, html: formattedHtml };
      if (Object.keys(displayHints).length > 0) {
        next.displayHints = displayHints;
      }
      out.push(next);
    }
    const contentHtml = out.map((p) => p.html).join("\n");
    return { contentHtml, paragraphs: out };
  } catch (err) {
    logger.warn("[draftFormatter] normalization failed; falling back to sanitized output", {
      message: err?.message,
    });
    return buildFallback(input);
  }
};

export default { formatDraftHtml, DRAFT_FORMAT_VERSION };
