import sanitizeHtml from "sanitize-html";

/**
 * ============================================================
 *  HTML sanitization allowlist — Requirement 4.3, 4.11
 * ============================================================
 *
 *  Allowed tags: h1–h6, p, ul, ol, li, blockquote, strong, em, a, code,
 *  sup, span
 *  Allowed attributes:
 *    a: href, rel, target
 *    code: class (for syntax highlight hints)
 *    sup: data-citation-numeral, data-source-url, class
 *    span: class, style (style further restricted via `allowedStyles`)
 *  Every <a> gets `rel="nofollow noopener"` automatically.
 *
 *  Requirement 4.11: user override marks (font-size and color) are
 *  serialized by the TipTap editor as inline styles on <span> elements.
 *  The allowlist permits a `style` attribute only on <span>, and only
 *  for the CSS properties `color` (3- or 6-digit hex prefixed with `#`)
 *  and `font-size` (the keyword set {"Small", "Default", "Large"} or
 *  the TipTap CSS equivalents emitted by the font-size mark — see
 *  `frontend/src/components/shared/RichTextEditor.jsx`'s
 *  FONT_SIZE_KEYWORD_TO_CSS map). Any other element, property, or
 *  value (including `javascript:` and `expression(`) is dropped because
 *  it does not match the regex allowlist below.
 */

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "em",
  "a",
  "code",
  "sup",
  "span",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "rel", "target"],
  code: ["class"],
  /**
   * `<sup>` carries inline citation metadata for the wizard's CitationMark
   * TipTap extension. Keep the attribute set tight — anything not in this
   * list (e.g. onclick) is dropped by sanitize-html.
   */
  sup: ["data-citation-numeral", "data-source-url", "class"],
  /**
   * `<span>` is the carrier for TipTap's TextStyle/Color font-size and
   * color override marks. `style` is permitted only on <span> and is
   * additionally filtered by `allowedStyles` below.
   */
  span: ["class", "style"],
};

/**
 * Per sanitize-html's `allowedStyles` semantics: a CSS property only
 * survives if (a) the element appears as a key, (b) the property name
 * appears under that element, and (c) the property *value* matches one
 * of the listed regexes. Anything else (different element, different
 * property, or non-matching value such as `javascript:alert(1)` or
 * `expression(...)`) is dropped.
 */
const ALLOWED_STYLES = {
  span: {
    color: [/^#([0-9a-f]{3}|[0-9a-f]{6})$/i],
    "font-size": [
      // TipTap font-size CSS equivalents emitted by RichTextEditor.jsx's
      // FONT_SIZE_KEYWORD_TO_CSS map.
      /^0\.875em$/i, // "Small"
      /^1\.25em$/i, // "Large"
      // "Default" emits no style attribute, so it never reaches the
      // sanitizer — but accept the bare keyword forms defensively in
      // case they ever round-trip through the editor.
      /^Small$/,
      /^Default$/,
      /^Large$/,
    ],
  },
};

export const sanitizeArticleHtml = (html = "") =>
  sanitizeHtml(String(html), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "nofollow noopener",
          target: attribs.target || "_blank",
        },
      }),
    },
    disallowedTagsMode: "discard",
    allowedSchemes: ["http", "https", "mailto"],
  });
