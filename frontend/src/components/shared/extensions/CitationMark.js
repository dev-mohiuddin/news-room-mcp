import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * ============================================================
 *  CitationMark — Requirement 4.5, 10.2, 10.3
 * ============================================================
 *
 *  Renders an inline `<sup>` containing a numbered citation that
 *  links to the corresponding `sourcesIndex[].url`. The mark is
 *  non-inclusive so typing right after a citation does not extend
 *  it. Click handler opens the source in a new tab.
 *
 *  HTML shape (matches backend `sanitizeArticleHtml` allowlist):
 *      <sup data-citation-numeral="N" data-source-url="https://…"
 *           class="citation-mark">[N]</sup>
 */

const CITATION_PLUGIN_KEY = new PluginKey("citationMarkClick");

export const CitationMark = Mark.create({
  name: "citation",
  inclusive: false,
  spanning: false,

  addAttributes() {
    return {
      numeral: {
        default: null,
        parseHTML: (el) =>
          parseInt(el?.getAttribute?.("data-citation-numeral"), 10) || null,
        renderHTML: (attrs) =>
          attrs?.numeral ? { "data-citation-numeral": String(attrs.numeral) } : {},
      },
      sourceUrl: {
        default: null,
        parseHTML: (el) => el?.getAttribute?.("data-source-url") || null,
        renderHTML: (attrs) =>
          attrs?.sourceUrl ? { "data-source-url": attrs.sourceUrl } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sup[data-citation-numeral]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, { class: "citation-mark" }),
      0,
    ];
  },

  addCommands() {
    return {
      setCitation:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetCitation:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addProseMirrorPlugins() {
    /**
     * Capture click on a citation mark and open the source URL in a
     * new tab. ProseMirror's Configuration iterates plugins by reading
     * `.state` on each entry — bare `{ props: {...} }` objects crash
     * here, so we must return a real `Plugin` instance.
     */
    return [
      new Plugin({
        key: CITATION_PLUGIN_KEY,
        props: {
          handleClickOn(view, _pos, _node, _nodePos, event) {
            const target = event?.target;
            if (!(target instanceof HTMLElement)) return false;
            const sup = target.closest?.("sup[data-citation-numeral]");
            if (!sup) return false;
            const url = sup.getAttribute?.("data-source-url");
            if (!url) return false;
            window.open(url, "_blank", "noopener,noreferrer");
            return true;
          },
        },
      }),
    ];
  },
});
