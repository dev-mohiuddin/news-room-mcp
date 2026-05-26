import sanitizeHtml from "sanitize-html";

/**
 * ============================================================
 *  HTML sanitization allowlist — Requirement 4.3
 * ============================================================
 *
 *  Allowed tags: h1–h6, p, ul, ol, li, blockquote, strong, em, a, code
 *  Allowed attributes:
 *    a: href, rel, target
 *    code: class (for syntax highlight hints)
 *  Every <a> gets `rel="nofollow noopener"` automatically.
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
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "rel", "target"],
  code: ["class"],
};

export const sanitizeArticleHtml = (html = "") =>
  sanitizeHtml(String(html), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
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
