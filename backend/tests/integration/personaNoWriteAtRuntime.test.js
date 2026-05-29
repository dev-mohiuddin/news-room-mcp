import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsPromises from "node:fs/promises";

import {
  composeSystemPrompt,
  ARTICLE_DRAFTER_PERSONA,
} from "#services/article/personas/loader.js";
import {
  buildDraftBlueprint,
  composeDraftConstraintsBlock,
} from "#services/article/preDraftPreparerService.js";

/**
 * Pre-Draft Preparer — no persona file mutation at runtime
 * ---------------------------------------------------------
 * Validates Requirement 7.6:
 *   "The Pre_Draft_Preparer SHALL inject runtime constraints via
 *    composeSystemPrompt only and SHALL NOT write to, append to, or
 *    otherwise mutate the persona Markdown file on disk during request
 *    handling."
 *
 * Strategy:
 *   - Patch every fs write/append entry point on the global `node:fs`
 *     and `node:fs/promises` modules to flag any write whose target path
 *     touches the persona file (`article-drafter.md`).
 *   - Build a representative blueprint via the real Pre-Draft Preparer
 *     pipeline and compose it into the system prompt the same way
 *     `draftService.runDraftStage` does.
 *   - Assert the persona-write counter remains at zero and the resulting
 *     prompt is a non-empty string.
 *   - Always restore the originals in a finally block so other tests in
 *     the suite see an untouched filesystem module.
 */

describe("Pre-Draft Preparer — Req 7.6 (no persona file mutation at runtime)", () => {
  it("does not write to the persona Markdown file", async () => {
    const originals = {
      writeFileSync: fs.writeFileSync,
      writeFile: fs.writeFile,
      appendFileSync: fs.appendFileSync,
      appendFile: fs.appendFile,
      writeFilePromise: fsPromises.writeFile,
      appendFilePromise: fsPromises.appendFile,
    };

    let writesToPersona = 0;
    const checkPath = (p) => {
      const s =
        typeof p === "string" ? p : p && typeof p.toString === "function" ? p.toString() : "";
      if (s.includes("article-drafter.md")) {
        writesToPersona++;
        throw new Error("Test guard: persona file write attempted");
      }
    };

    fs.writeFileSync = (p, ...a) => {
      checkPath(p);
      return originals.writeFileSync(p, ...a);
    };
    fs.writeFile = (p, ...a) => {
      checkPath(p);
      return originals.writeFile(p, ...a);
    };
    fs.appendFileSync = (p, ...a) => {
      checkPath(p);
      return originals.appendFileSync(p, ...a);
    };
    fs.appendFile = (p, ...a) => {
      checkPath(p);
      return originals.appendFile(p, ...a);
    };
    fsPromises.writeFile = async (p, ...a) => {
      checkPath(p);
      return originals.writeFilePromise(p, ...a);
    };
    fsPromises.appendFile = async (p, ...a) => {
      checkPath(p);
      return originals.appendFilePromise(p, ...a);
    };

    try {
      const stubBrief = {
        topic: "test",
        targetKeyword: "test",
        sources: [
          { url: "https://example.com/a", title: "A", cleanedMarkdown: "x" },
          { url: "https://example.com/b", title: "B", cleanedMarkdown: "y" },
        ],
      };
      const stubOutline = [
        { heading: "S1", subPoints: ["a", "b"], estimatedWordCount: 200 },
        { heading: "S2", subPoints: ["c", "d"], estimatedWordCount: 200 },
      ];

      const blueprint = buildDraftBlueprint({
        outline: stubOutline,
        brief: stubBrief,
      });
      const constraints = composeDraftConstraintsBlock(blueprint || []);
      const prompt = composeSystemPrompt(ARTICLE_DRAFTER_PERSONA, [
        "RUNTIME CONSTRAINTS:",
        ...constraints,
      ]);

      assert.equal(typeof prompt, "string");
      assert.ok(prompt.length > 0);
      assert.equal(writesToPersona, 0, "no writes to persona file at runtime");
    } finally {
      fs.writeFileSync = originals.writeFileSync;
      fs.writeFile = originals.writeFile;
      fs.appendFileSync = originals.appendFileSync;
      fs.appendFile = originals.appendFile;
      fsPromises.writeFile = originals.writeFilePromise;
      fsPromises.appendFile = originals.appendFilePromise;
    }
  });
});
