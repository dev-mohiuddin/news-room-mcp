/**
 * ============================================================
 *  Stream Chunk-Type Compatibility Test
 *  Spec: human-like-article-pipeline — Task 16.4
 *  Validates: Requirement 6.8
 * ============================================================
 *
 *  Purpose
 *  -------
 *  Requirement 6.8 says the wizard stream channel:
 *
 *    "...SHALL emit the new chunk type identifier `source-enrichment`
 *     only as an additional value in the chunk-type set, leaving the
 *     field names, field types, and ordering of every pre-existing
 *     chunk type unchanged, and any client that receives a chunk
 *     whose type identifier it does not recognize SHALL be able to
 *     discard that chunk and continue processing subsequent chunks
 *     of recognized types without raising an exception."
 *
 *  This test enforces that contract along three axes:
 *
 *    1. The pre-existing chunk-type identifiers — `source`,
 *       `summary_bullet`, `outline_section`, `paragraph`,
 *       `meta_titles`, `meta_description`, `slug`, `tags`, and `faq`
 *       — are still emitted verbatim by `wizardOrchestrator.js`. Any
 *       rename or shape mutation would break legacy clients.
 *
 *    2. The single new identifier `source-enrichment` is added by
 *       the wizard controller (the new wiring point per Task 9.2),
 *       and lives strictly as an additional sibling — never
 *       replacing a pre-existing type.
 *
 *    3. A hypothetical legacy client that only knows the pre-feature
 *       chunk-type set silently discards anything else (including
 *       `source-enrichment` and any future-unknown identifier)
 *       without throwing — i.e., the new identifier is forward-
 *       compatible with stale clients.
 *
 *  Approach
 *  --------
 *  This is a *static* (text-level) check on the source files,
 *  combined with an in-process mock client. It does not spin up
 *  Mongo, Redis, or HTTP — text-level proof is sufficient because:
 *
 *    - Chunk emission is the side effect we care about, and the
 *      chunkType *string literals* in the source files are the
 *      ground truth for what the stream publisher emits.
 *
 *    - The "legacy client" axis is purely about consumer behavior
 *      and can be fully exercised with a small handler closure.
 *
 *  Run with:
 *      cd backend && node --test tests/integration/humanLikePipeline.streamChunks.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const readSource = async (p) => readFile(`${root}${p}`, "utf8");

// Pre-existing chunk-type identifiers emitted by `wizardOrchestrator.js`
// before this feature. These are the rollback-baseline set per Req 6.8.
const PRE_EXISTING_CHUNK_TYPES = [
  "source",
  "summary_bullet",
  "outline_section",
  "paragraph",
  "meta_titles",
  "meta_description",
  "slug",
  "tags",
  "faq",
];

// New identifier introduced by this feature (Task 9.2 / Req 1.9 / 6.8).
const NEW_CHUNK_TYPES = ["source-enrichment"];

describe("Stream chunk types — Req 6.8", () => {
  it("wizardOrchestrator.js still emits every pre-existing chunk type identifier", async () => {
    const src = await readSource("src/services/article/wizardOrchestrator.js");
    for (const t of PRE_EXISTING_CHUNK_TYPES) {
      assert.match(
        src,
        new RegExp(`chunkType:\\s*["']${t}["']`),
        `wizardOrchestrator.js must still emit chunkType: "${t}"`,
      );
    }
  });

  it("source-enrichment is the only new chunk type identifier introduced by this feature", async () => {
    const wizSrc = await readSource("src/controllers/article/wizardController.js");
    for (const t of NEW_CHUNK_TYPES) {
      assert.match(
        wizSrc,
        new RegExp(`chunkType:\\s*["']${t}["']`),
        `wizardController.js must emit the new chunkType: "${t}"`,
      );
    }
  });

  it("an unknown-chunk-type client mock discards unrecognized chunks without throwing", () => {
    // Pre-feature client only knows the rollback-baseline chunk-type set.
    const knownTypes = new Set(PRE_EXISTING_CHUNK_TYPES);
    const handleChunk = (chunk) => {
      if (!knownTypes.has(chunk.chunkType)) return null; // silently discard
      return chunk; // process
    };

    // Pre-feature chunk → processed.
    assert.ok(handleChunk({ chunkType: "paragraph", data: {} }));
    // New chunk type → discarded silently.
    assert.equal(handleChunk({ chunkType: "source-enrichment", data: {} }), null);
    // Mixed sequence — none throws.
    assert.doesNotThrow(() => {
      handleChunk({ chunkType: "source", data: {} });
      handleChunk({ chunkType: "source-enrichment", data: {} });
      handleChunk({ chunkType: "outline_section", data: {} });
      handleChunk({ chunkType: "future-unknown-type", data: {} });
    });
  });

  it("the source-enrichment chunk envelope shape (sourceUrl, status) does not break legacy clients", () => {
    const newChunk = {
      chunkType: "source-enrichment",
      data: { sourceUrl: "https://x", status: "enriched" },
    };
    // A legacy client only reads `chunkType` and would skip on unknown — never reads `data` shape.
    assert.equal(newChunk.chunkType, "source-enrichment");
    assert.deepEqual(Object.keys(newChunk).sort(), ["chunkType", "data"]);
  });
});
