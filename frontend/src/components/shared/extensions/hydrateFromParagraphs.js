/**
 * ============================================================
 *  hydrateFromParagraphs — Requirement 10.6, 10.9
 * ============================================================
 *
 *  Build a single HTML string suitable for `editor.commands.setContent`
 *  from an Article.paragraphs array. Citations are appended as
 *  `<sup data-citation-numeral="N" data-source-url="…">[N]</sup>`
 *  inside the closing `</p>` of each factual paragraph that doesn't
 *  already carry the mark.
 *
 *  Rules:
 *    - Skip paragraphs whose `html` is empty.
 *    - Reuse `bracketedNumeral` when present; fall back to looking up
 *      the URL in `sourcesIndex[]` to derive the numeral.
 *    - Do NOT modify a paragraph whose HTML already contains a
 *      `data-citation-numeral` attribute (the draft service may
 *      have inlined the mark itself).
 *    - Do NOT reach into headings, lists, or blockquotes — citations
 *      are appended only to top-level `<p>` tags.
 */

const buildIndexLookup = (sourcesIndex = []) => {
  const map = new Map();
  for (const entry of sourcesIndex || []) {
    if (entry?.url && Number.isInteger(entry?.numeral)) {
      map.set(entry.url, entry.numeral);
    }
  }
  return map;
};

const renderCitationTag = (numeral, sourceUrl) =>
  `<sup data-citation-numeral="${numeral}" data-source-url="${sourceUrl}" class="citation-mark">[${numeral}]</sup>`;

export const hydrateFromParagraphs = (paragraphs = [], sourcesIndex = []) => {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return "";
  const lookup = buildIndexLookup(sourcesIndex);

  const out = [];
  for (const p of paragraphs) {
    let html = String(p?.html || "").trim();
    if (!html) continue;

    const citations = Array.isArray(p?.citations) ? p.citations : [];
    if (citations.length === 0 || /data-citation-numeral=/i.test(html)) {
      out.push(html);
      continue;
    }

    const tags = [];
    for (const c of citations) {
      const url = c?.url;
      const numeral =
        Number.isInteger(c?.bracketedNumeral) && c.bracketedNumeral > 0
          ? c.bracketedNumeral
          : lookup.get(url) || null;
      if (!numeral || !url) continue;
      tags.push(renderCitationTag(numeral, url));
    }

    if (tags.length === 0) {
      out.push(html);
      continue;
    }

    if (/<\/p>\s*$/i.test(html)) {
      out.push(html.replace(/<\/p>\s*$/i, `${tags.join("")}</p>`));
    } else {
      out.push(`${html}${tags.join("")}`);
    }
  }

  return out.join("\n");
};
