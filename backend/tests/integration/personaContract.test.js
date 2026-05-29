import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { ARTICLE_DRAFTER_PERSONA } from "#services/article/personas/loader.js";

/**
 * Article Drafter Persona Contract Preservation
 * ----------------------------------------------
 * Validates Requirement 7 acceptance criteria 7.1, 7.2, 7.3:
 *   - 7.1: submit_draft tool name + input-schema top-level field names,
 *          JSON types, and `required` flags remain byte-for-byte identical
 *          to the rollback baseline.
 *   - 7.2: paragraph tagging rules allow exactly the four tag values
 *          {"intro", "transition", "opinion", "factual"}.
 *   - 7.3: citation density numeric bounds (min=1 per ~300 words for
 *          `factual` paragraphs) remain byte-for-byte identical to the
 *          rollback baseline.
 *
 * The DRAFT_TOOL_INPUT_SCHEMA is a module-private const in draftService.js,
 * so we capture the rollback baseline by grepping the service source. The
 * persona Markdown file is captured by reading article-drafter.md directly.
 */

/* ── Rollback baseline (pre-feature codebase) ─────────────────── */

const ROLLBACK_BASELINE = Object.freeze({
  // 7.1: persona constant export name from personas/loader.js
  personaExportName: "ARTICLE_DRAFTER_PERSONA",

  // 7.1: submit_draft tool name (string used in draftService.js useTool call)
  toolName: "submit_draft",

  // 7.1: DRAFT_TOOL_INPUT_SCHEMA top-level shape — field names + JSON types + required flags
  inputSchema: {
    topLevelType: "object",
    topLevelPropertyNames: ["paragraphs"],
    topLevelRequired: ["paragraphs"],
    paragraphsType: "array",
    paragraphItemType: "object",
    paragraphItemPropertyNames: ["html", "markdown", "tag", "citations"],
    paragraphItemRequired: ["html", "tag"],
  },

  // 7.2: paragraph tag set (DRAFT_TOOL_INPUT_SCHEMA.properties.paragraphs.items.properties.tag.enum)
  paragraphTagSet: ["factual", "intro", "transition", "opinion"],

  // 7.3: citation density rule for factual paragraphs:
  //   minCitationsPerSection = Math.max(1, Math.ceil(w / 300))
  citationDensity: {
    floor: 1,
    wordsPerCitation: 300,
    requiredTags: ["factual"],
  },
});

/* ── File-source helpers ──────────────────────────────────────── */

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DRAFT_SERVICE_PATH = `${PROJECT_ROOT}src/services/article/draftService.js`;
const PERSONA_MD_PATH = `${PROJECT_ROOT}src/services/article/personas/article-drafter.md`;
const LOADER_PATH = `${PROJECT_ROOT}src/services/article/personas/loader.js`;

const readSource = async (path) => readFile(path, "utf8");

describe("Article Drafter Persona Contract Preservation (Req 7.1, 7.2, 7.3)", () => {
  describe("7.1 — persona export name + submit_draft tool name + input-schema shape", () => {
    it("exports ARTICLE_DRAFTER_PERSONA by exact name from personas/loader.js", async () => {
      // Runtime check — the import at the top of this file would throw on
      // module-resolution if the named export were renamed; assert it is a
      // non-empty string so a future "export const ARTICLE_DRAFTER_PERSONA = ''"
      // shortcut would still trip the test.
      assert.equal(typeof ARTICLE_DRAFTER_PERSONA, "string");
      assert.ok(
        ARTICLE_DRAFTER_PERSONA.length > 0,
        "ARTICLE_DRAFTER_PERSONA must be a non-empty string"
      );

      // Source-level check — the loader file must literally export the
      // baseline name (guards against `export { X as ARTICLE_DRAFTER_PERSONA }`
      // shenanigans that would still satisfy the import above).
      const loaderSrc = await readSource(LOADER_PATH);
      assert.match(
        loaderSrc,
        new RegExp(`export\\s+const\\s+${ROLLBACK_BASELINE.personaExportName}\\b`),
        `loader.js must export const ${ROLLBACK_BASELINE.personaExportName}`
      );
    });

    it("draftService.js declares submit_draft as the tool name", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);
      assert.match(
        src,
        new RegExp(`toolName:\\s*["']${ROLLBACK_BASELINE.toolName}["']`),
        `draftService.js must call useTool with toolName: "${ROLLBACK_BASELINE.toolName}"`
      );
    });

    it("DRAFT_TOOL_INPUT_SCHEMA preserves top-level shape: { type:'object', properties:{ paragraphs }, required:['paragraphs'] }", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);

      // Top-level type
      assert.match(
        src,
        /const\s+DRAFT_TOOL_INPUT_SCHEMA\s*=\s*\{\s*type:\s*["']object["']/,
        "DRAFT_TOOL_INPUT_SCHEMA must declare type: 'object' at the top level"
      );

      // Top-level required: ["paragraphs"] — match the closing required line
      // immediately preceding the schema's terminating };
      assert.match(
        src,
        /required:\s*\[\s*["']paragraphs["']\s*\]\s*,?\s*\}\s*;/,
        "DRAFT_TOOL_INPUT_SCHEMA must end with required: ['paragraphs']"
      );

      // paragraphs is declared as an array
      assert.match(
        src,
        /paragraphs:\s*\{\s*type:\s*["']array["']/,
        "DRAFT_TOOL_INPUT_SCHEMA.paragraphs must declare type: 'array'"
      );

      // Paragraph items are objects whose required set is exactly ["html", "tag"]
      assert.match(
        src,
        /required:\s*\[\s*["']html["']\s*,\s*["']tag["']\s*\]/,
        "Per-paragraph required must be exactly ['html', 'tag']"
      );

      // Paragraph item properties: html (string), markdown (string), tag (string with enum), citations (array)
      assert.match(
        src,
        /html:\s*\{\s*type:\s*["']string["']/,
        "Paragraph.html must be type: 'string'"
      );
      assert.match(
        src,
        /markdown:\s*\{\s*type:\s*["']string["']\s*\}/,
        "Paragraph.markdown must be type: 'string'"
      );
      assert.match(
        src,
        /tag:\s*\{\s*type:\s*["']string["']/,
        "Paragraph.tag must be type: 'string'"
      );
      assert.match(
        src,
        /citations:\s*\{\s*type:\s*["']array["']/,
        "Paragraph.citations must be type: 'array'"
      );
    });
  });

  describe("7.2 — paragraph tag set is exactly {factual, intro, transition, opinion}", () => {
    it("DRAFT_TOOL_INPUT_SCHEMA.tag.enum lists exactly the four baseline tag values", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);
      const expected = ROLLBACK_BASELINE.paragraphTagSet
        .map((t) => `["']${t}["']`)
        .join("\\s*,\\s*");
      assert.match(
        src,
        new RegExp(`enum:\\s*\\[\\s*${expected}\\s*\\]`),
        `tag.enum must be exactly [${ROLLBACK_BASELINE.paragraphTagSet.join(", ")}] in this order`
      );
    });

    it("article-drafter.md persona Markdown lists every baseline tag in its tagging rules", async () => {
      const md = await readSource(PERSONA_MD_PATH);
      for (const tag of ROLLBACK_BASELINE.paragraphTagSet) {
        assert.match(
          md,
          new RegExp(`\`${tag}\``),
          `Persona Markdown must reference the \`${tag}\` paragraph tag`
        );
      }
    });
  });

  describe("7.3 — citation density numeric bounds for factual paragraphs", () => {
    it("validateAndShape preserves Math.max(1, Math.ceil(w / 300)) for factual paragraph density", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);
      assert.match(
        src,
        /Math\.max\(\s*1\s*,\s*Math\.ceil\(\s*w\s*\/\s*300\s*\)\s*\)/,
        "Citation density floor must remain Math.max(1, Math.ceil(w / 300))"
      );
    });

    it("article-drafter.md preserves the '≥ 1 citation per ~300 words' rule for factual paragraphs", async () => {
      const md = await readSource(PERSONA_MD_PATH);
      assert.match(
        md,
        /≥\s*1\s*citation\s*per\s*~?\s*300\s*words/i,
        "Persona Markdown must keep the '≥ 1 citation per ~300 words' citation density rule"
      );
    });
  });

  describe("Persona Markdown structural preservation (Req 7.4 supporting check)", () => {
    it("preserves every pre-feature top-level section heading", async () => {
      const md = await readSource(PERSONA_MD_PATH);
      const requiredHeadings = [
        "# Identity",
        "# Core Mission",
        "# Critical Rules",
        "# Voice Quick-Reference",
        "# Sound Human, Not Synthetic",
        "# Output",
      ];
      for (const heading of requiredHeadings) {
        assert.ok(
          md.includes(heading),
          `Persona Markdown must preserve the section heading '${heading}'`
        );
      }
    });

    it("adds the new '# Layout-aware output' section without removing pre-existing sections", async () => {
      const md = await readSource(PERSONA_MD_PATH);
      assert.ok(
        md.includes("# Layout-aware output"),
        "Persona Markdown must contain the new '# Layout-aware output' section"
      );
    });
  });
});
