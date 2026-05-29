/**
 * ============================================================
 *  Endpoint Request/Response Contract Test
 *  Spec: human-like-article-pipeline — Task 16.3
 *  Validates: Requirements 6.3
 * ============================================================
 *
 *  Purpose
 *  -------
 *  Pin the exact required-field set, exact response-field set, exact
 *  field types, and success HTTP status code for each of the four
 *  pipeline-touching endpoints called out in Req 6.3:
 *
 *    1. PATCH /articles/:id/brief/source-selections
 *    2. POST  /articles/:id/stages/outline/regenerate
 *    3. POST  /articles/:id/stages/draft/run
 *    4. POST  /articles/:id/stages/seo/run
 *
 *  Why this is a static (source-level) contract test
 *  -------------------------------------------------
 *  Req 6.3 is a structural guarantee: "the pipeline SHALL preserve …
 *  the exact set of required request body field names, the exact set
 *  of response body field names, the field types declared by the
 *  pre-feature codebase, and the HTTP status code returned on the
 *  success path."  Spinning up Express, Mongo, Redis, BullMQ, and the
 *  Anthropic SDK to read four response shapes and four schemas is
 *  overkill — those shapes live in source files we can read and
 *  pattern-match against. A regression that adds (or removes) a field
 *  in any of these positions trips this test at build time, before
 *  any HTTP traffic is involved.
 *
 *  The live HTTP behavior of the four endpoints is exercised end-to-end
 *  by `backend/scripts/wizardSmokeTest.js` against a real stack.
 *
 *  Strategy per endpoint
 *  ---------------------
 *  - Read the controller source (`wizardController.js`) as a string,
 *    locate each handler, and regex-assert the exact `res.success(...)`
 *    call shape: status code (or default 200) + data field set.
 *  - Read the request-validation source (`wizardValidation.js`) as a
 *    string and assert the zod schema's required body field names and
 *    types match the rollback baseline. For runStage and regenerateStage
 *    the body is empty (path-param-only), so we assert the
 *    `stageRunParamSchema` instead.
 *  - For `enrichmentMode` (the only new optional request field), assert
 *    that the controller validates it inline against the documented
 *    set {"auto","skip"} and rejects unknown values with the
 *    `INVALID_ENRICHMENT_MODE` code.
 *
 *  Type contract for request bodies
 *  --------------------------------
 *  - selectedCanonicalUrls : array of strings (zod `z.array(z.string().url())`)
 *  - id (path param)        : string (zod `z.string().min(1)`)
 *  - stage (path param)     : enum string in {"research","outline","draft","seo"}
 *
 *  Type contract for response bodies
 *  ---------------------------------
 *  patchBriefSelections:
 *    statusCode: 200 (default)
 *    body.data : { selectedCanonicalUrls: string[] }   (single key)
 *
 *  regenerateStage / runStage:
 *    statusCode: 202 (explicit)
 *    body.data : { articleId, stage, jobId }           (three keys)
 *      where:
 *        articleId : ObjectId-shaped value (article._id from Mongoose)
 *        stage     : string (the enum value from the path param)
 *        jobId     : string (BullMQ job id) | null on enqueue failure
 *
 *  Note on `runStage` covering both /draft/run and /seo/run
 *  --------------------------------------------------------
 *  A single controller (`runStage`) handles all four runnable stages
 *  (research / outline / draft / seo) — the route `:stage` parameter
 *  selects which one. Pinning the controller's `res.success(...)` call
 *  shape therefore pins the contract for both /draft/run and /seo/run
 *  in one assertion.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/integration/this-file -> /backend/...
const BACKEND_ROOT = path.resolve(__dirname, "../..");

const readSource = (relPath) =>
  readFile(path.join(BACKEND_ROOT, relPath), "utf-8");

/* ------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------ */

/**
 * Locate the body of a named exported handler in a controller source.
 * Handlers in this file are written as
 *   `export const NAME = catchAsync(async (req, res) => { ... });`
 * We carve out the substring from the handler's `export const NAME`
 * through the matching closing `});` so a regex on the slice can't
 * accidentally match a sibling handler.
 *
 * The matcher counts paren/brace depth from the first `(` after
 * `catchAsync` so it's robust to nested object literals.
 */
const extractHandlerBody = (src, name) => {
  const startMarker = `export const ${name} = catchAsync(`;
  const startIdx = src.indexOf(startMarker);
  assert.ok(
    startIdx !== -1,
    `Handler '${name}' not found in controller source`
  );
  let depth = 0;
  let i = startIdx + startMarker.length - 1; // position of the `(`
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        // Include the closing `)` and the trailing `;`.
        return src.slice(startIdx, i + 2);
      }
    }
  }
  throw new Error(`Could not find end of handler '${name}'`);
};

/* ------------------------------------------------------------ *
 *  Test suite
 * ------------------------------------------------------------ */

describe("Endpoint contract preservation (Req 6.3)", () => {
  /* ------------------------------------------------------------ *
   *  PATCH /articles/:id/brief/source-selections
   * ------------------------------------------------------------ */
  describe("PATCH /articles/:id/brief/source-selections", () => {
    it("response body is exactly { selectedCanonicalUrls } at HTTP 200", async () => {
      const src = await readSource("src/controllers/article/wizardController.js");
      const handler = extractHandlerBody(src, "patchBriefSelections");

      // Exactly one res.success(...) call inside this handler.
      const resSuccessCount = (handler.match(/res\.success\(/g) || []).length;
      assert.equal(
        resSuccessCount,
        1,
        "patchBriefSelections must invoke res.success exactly once"
      );

      // The success call must NOT specify a non-200 statusCode — default
      // applies, which is 200 (see responseUtil.js `globalResponse`).
      assert.ok(
        !/res\.success\([\s\S]*?statusCode\s*:/.test(handler),
        "patchBriefSelections must use the default statusCode (200)"
      );

      // The data payload contains exactly the field `selectedCanonicalUrls`.
      // Match the exact `data: { selectedCanonicalUrls }` shorthand —
      // a regression that adds a sibling key would fail this assertion.
      assert.match(
        handler,
        /res\.success\(\s*\{\s*message\s*:\s*["'][^"']+["']\s*,\s*data\s*:\s*\{\s*selectedCanonicalUrls\s*\}\s*\}\s*\)/,
        "patchBriefSelections response data must be exactly { selectedCanonicalUrls }"
      );
    });

    it("required request field set is exactly { selectedCanonicalUrls } typed as string[]", async () => {
      const src = await readSource("src/validations/article/wizardValidation.js");

      // Locate the briefSelectionsSchema export and pin its body field set.
      // The schema as written:
      //   body: z.object({
      //     selectedCanonicalUrls: z.array(z.string().url()).min(3).max(50),
      //   })
      const schemaMatch = src.match(
        /export\s+const\s+briefSelectionsSchema\s*=\s*z\.object\(\{([\s\S]*?)\n\}\);/
      );
      assert.ok(schemaMatch, "briefSelectionsSchema must be exported");

      const schemaSrc = schemaMatch[1];

      // Required path param: id
      assert.match(
        schemaSrc,
        /params\s*:\s*z\.object\(\s*\{\s*id\s*:\s*z\.string\(\)\.min\(1\)/,
        "briefSelectionsSchema must require path param `id` typed as string"
      );

      // Required body field: selectedCanonicalUrls — array of URL strings.
      assert.match(
        schemaSrc,
        /selectedCanonicalUrls\s*:\s*z[\s\S]*?\.array\(\s*z\.string\(\)\.url\(\)\s*\)/,
        "briefSelectionsSchema must require selectedCanonicalUrls as array<string-url>"
      );

      // No other top-level body keys — the schema's body is exactly one key.
      // Capture the body z.object({...}) literal and assert its keys.
      const bodyBlockMatch = schemaSrc.match(
        /body\s*:\s*z\.object\(\s*\{([\s\S]*?)\n\s{2,}\}\s*\)/
      );
      assert.ok(bodyBlockMatch, "body block must be present in briefSelectionsSchema");
      const bodyBlock = bodyBlockMatch[1];

      // Strip comments and strings, then collect top-level identifier keys
      // appearing as `<ident>:`. We use a coarse match — the block is
      // small and well-formed.
      const keys = Array.from(
        bodyBlock.matchAll(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm)
      ).map((m) => m[1]);

      assert.deepEqual(
        keys.sort(),
        ["selectedCanonicalUrls"],
        "briefSelectionsSchema body must declare exactly { selectedCanonicalUrls }"
      );
    });

    it("controller validates optional enrichmentMode in {auto, skip} with INVALID_ENRICHMENT_MODE", async () => {
      // `enrichmentMode` is intentionally not in the zod schema (Req 1.10,
      // 1.11): the controller validates it inline so an unknown value
      // returns the structured `INVALID_ENRICHMENT_MODE` code rather than
      // a generic zod error.
      const src = await readSource("src/controllers/article/wizardController.js");
      const handler = extractHandlerBody(src, "patchBriefSelections");

      assert.match(
        handler,
        /enrichmentMode\s*!==\s*undefined[\s\S]*?enrichmentMode\s*!==\s*["']auto["'][\s\S]*?enrichmentMode\s*!==\s*["']skip["']/,
        "patchBriefSelections must validate enrichmentMode against {auto, skip}"
      );
      assert.match(
        handler,
        /code\s*:\s*["']INVALID_ENRICHMENT_MODE["']/,
        "patchBriefSelections must reject unknown enrichmentMode with code INVALID_ENRICHMENT_MODE"
      );
      assert.match(
        handler,
        /throwError\(\s*[\s\S]*?,\s*400\s*,/,
        "INVALID_ENRICHMENT_MODE must be raised at HTTP 400"
      );
    });
  });

  /* ------------------------------------------------------------ *
   *  POST /articles/:id/stages/outline/regenerate
   *  POST /articles/:id/stages/draft/run
   *  POST /articles/:id/stages/seo/run
   *
   *  These three endpoints share two controllers (`regenerateStage` and
   *  `runStage`) parameterized by `:stage`. The contract is:
   *    - path params: { id, stage } typed as `string` and an enum
   *    - response: 202 with body.data = { articleId, stage, jobId }
   * ------------------------------------------------------------ */
  describe("stage lifecycle endpoints (regenerate/run)", () => {
    it("path-param schema requires { id: string, stage: enum } for runnable stages", async () => {
      const src = await readSource("src/validations/article/wizardValidation.js");

      // The runnable-stage enum must include draft, seo, outline (and
      // research) — all four runnable stages — and exclude `publish`
      // since /draft/run and /seo/run go through `stageRunParamSchema`.
      assert.match(
        src,
        /RUNNABLE_STAGE_PARAM\s*=\s*z\.enum\(\s*\[\s*["']research["']\s*,\s*["']outline["']\s*,\s*["']draft["']\s*,\s*["']seo["']\s*\]/,
        "RUNNABLE_STAGE_PARAM must enumerate exactly research/outline/draft/seo"
      );

      // stageRunParamSchema must declare `id: string` and `stage: enum`.
      const schemaMatch = src.match(
        /export\s+const\s+stageRunParamSchema\s*=\s*z\.object\(\{([\s\S]*?)\n\}\);/
      );
      assert.ok(schemaMatch, "stageRunParamSchema must be exported");
      const schemaSrc = schemaMatch[1];

      assert.match(
        schemaSrc,
        /id\s*:\s*z\.string\(\)\.min\(1\)/,
        "stageRunParamSchema must declare `id: z.string().min(1)`"
      );
      assert.match(
        schemaSrc,
        /stage\s*:\s*RUNNABLE_STAGE_PARAM/,
        "stageRunParamSchema must declare `stage: RUNNABLE_STAGE_PARAM`"
      );
    });

    it("POST /articles/:id/stages/:stage/run responds at 202 with { articleId, stage, jobId }", async () => {
      const src = await readSource("src/controllers/article/wizardController.js");
      const handler = extractHandlerBody(src, "runStage");

      // statusCode must be 202.
      assert.match(
        handler,
        /res\.success\(\s*\{\s*statusCode\s*:\s*202\s*,/,
        "runStage must respond at HTTP 202"
      );

      // data shape must be exactly { articleId: article._id, stage, jobId }.
      // Pin the field set with an exact-shape regex. Trailing comma after
      // the data object is optional (Prettier style).
      assert.match(
        handler,
        /res\.success\(\s*\{\s*statusCode\s*:\s*202\s*,\s*message\s*:\s*[^\n]+,\s*data\s*:\s*\{\s*articleId\s*:\s*article\._id\s*,\s*stage\s*,\s*jobId\s*\}\s*,?\s*\}\s*\)/,
        "runStage data must be exactly { articleId: article._id, stage, jobId }"
      );

      // No other res.success call inside runStage.
      const resSuccessCount = (handler.match(/res\.success\(/g) || []).length;
      assert.equal(
        resSuccessCount,
        1,
        "runStage must invoke res.success exactly once"
      );
    });

    it("POST /articles/:id/stages/outline/regenerate responds at 202 with { articleId, stage, jobId }", async () => {
      const src = await readSource("src/controllers/article/wizardController.js");
      const handler = extractHandlerBody(src, "regenerateStage");

      // statusCode must be 202.
      assert.match(
        handler,
        /res\.success\(\s*\{\s*statusCode\s*:\s*202\s*,/,
        "regenerateStage must respond at HTTP 202 on the success path"
      );

      // Final res.success call (the one that runs on the success path)
      // must carry data: { articleId: article._id, stage, jobId }. Trailing
      // comma after the data object is optional (Prettier style).
      assert.match(
        handler,
        /res\.success\(\s*\{\s*statusCode\s*:\s*202\s*,\s*message\s*:\s*[^\n]+,\s*data\s*:\s*\{\s*articleId\s*:\s*article\._id\s*,\s*stage\s*,\s*jobId\s*\}\s*,?\s*\}\s*\)/,
        "regenerateStage data must be exactly { articleId: article._id, stage, jobId }"
      );

      // Only one success call — the early-returns are throwError paths,
      // not res.success paths.
      const resSuccessCount = (handler.match(/res\.success\(/g) || []).length;
      assert.equal(
        resSuccessCount,
        1,
        "regenerateStage must invoke res.success exactly once"
      );
    });

    it("regenerate and run handlers share the { articleId, stage, jobId } response field set", async () => {
      // Sanity cross-check: the field-name set is identical across the
      // two stage-lifecycle handlers, so any future divergence (e.g.
      // adding a sibling key to one but not the other) trips this test.
      const src = await readSource("src/controllers/article/wizardController.js");
      const runHandler = extractHandlerBody(src, "runStage");
      const regenHandler = extractHandlerBody(src, "regenerateStage");

      const dataShape = /data\s*:\s*\{\s*articleId\s*:\s*article\._id\s*,\s*stage\s*,\s*jobId\s*\}/;
      assert.match(runHandler, dataShape);
      assert.match(regenHandler, dataShape);
    });
  });

  /* ------------------------------------------------------------ *
   *  Cross-cutting: response success-status defaults
   * ------------------------------------------------------------ */
  describe("response status code defaults (responseUtil)", () => {
    it("res.success default statusCode is 200 (used by patchBriefSelections)", async () => {
      const src = await readSource("src/utils/responseUtil.js");
      // `statusCode = 200` is the default-parameter destructure inside
      // `res.success`. A change to this default would silently shift the
      // patchBriefSelections success status, so pin it.
      assert.match(
        src,
        /statusCode\s*=\s*200/,
        "responseUtil.globalResponse must default statusCode to 200"
      );
    });
  });
});
