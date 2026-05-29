import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  isFlagEnabled,
  HUMAN_LIKE_PIPELINE_ENABLED,
  HLP_SOURCE_ENRICH_ENABLED,
  HLP_OUTLINE_ENRICH_ENABLED,
  HLP_DRAFT_FORMAT_ENABLED,
  HLP_SEO_HARDEN_ENABLED,
} from "#utils/featureFlags.js";

/**
 * Per-Stage Flag Isolation
 * -------------------------
 * Validates Requirement 6.2 (Property 12 — Feature-flag isolation):
 *   "WHERE any of the per-stage feature flags HLP_SOURCE_ENRICH_ENABLED,
 *    HLP_OUTLINE_ENRICH_ENABLED, HLP_DRAFT_FORMAT_ENABLED, or
 *    HLP_SEO_HARDEN_ENABLED is false, THE corresponding stage SHALL
 *    produce the same HTTP status codes, response body field names and
 *    types, and persisted document field names and types as the
 *    pre-feature codebase for that stage, while other stages whose
 *    flags are true MAY run new behavior."
 *
 * The wiring tasks (9.1, 10.1, 11.1, 11.2, 13.1) gate every new
 * code path on `isFlagEnabled(<stage flag>)`. This test verifies — at
 * the unit level of the gate itself, not via a full HTTP/DB
 * integration — that:
 *
 *   1. Each per-stage flag evaluates independently of the others
 *      (toggling one does not flip another).
 *   2. The master flag and the per-stage flags evaluate independently
 *      of each other.
 *   3. Each stage's source code gates its new branch on its own flag,
 *      so when that flag is unset the new behavior is unreachable
 *      ("matches the rollback baseline"), and when the flag is "true"
 *      the new branch is reachable ("the enabled stages may run new
 *      behavior").
 */

/* ── Source-file pinning (rollback-baseline guards) ───────────── */

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const WIZARD_CONTROLLER_PATH = `${PROJECT_ROOT}src/controllers/article/wizardController.js`;
const DRAFT_SERVICE_PATH = `${PROJECT_ROOT}src/services/article/draftService.js`;
const SEO_SERVICE_PATH = `${PROJECT_ROOT}src/services/article/seoService.js`;

const readSource = async (path) => readFile(path, "utf8");

/** Snapshot, mutate, and restore the four per-stage flags + master. */
const ALL_HLP_FLAGS = [
  HUMAN_LIKE_PIPELINE_ENABLED,
  HLP_SOURCE_ENRICH_ENABLED,
  HLP_OUTLINE_ENRICH_ENABLED,
  HLP_DRAFT_FORMAT_ENABLED,
  HLP_SEO_HARDEN_ENABLED,
];

let savedEnv;

const clearAllFlags = () => {
  for (const name of ALL_HLP_FLAGS) {
    delete process.env[name];
  }
};

beforeEach(() => {
  savedEnv = {};
  for (const name of ALL_HLP_FLAGS) {
    savedEnv[name] = process.env[name];
  }
  clearAllFlags();
});

afterEach(() => {
  for (const name of ALL_HLP_FLAGS) {
    if (savedEnv[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = savedEnv[name];
    }
  }
});

/* ── Tests ────────────────────────────────────────────────────── */

describe("Per-stage flag isolation (Req 6.2 / Property 12)", () => {
  describe("isFlagEnabled evaluates each flag independently", () => {
    it("returns true only for the flag whose env var is 'true'", () => {
      // Only HLP_OUTLINE_ENRICH_ENABLED is on; every sibling must be off.
      process.env[HLP_OUTLINE_ENRICH_ENABLED] = "true";

      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), false);
    });

    it("source-enrich flag: ON does not enable any sibling", () => {
      process.env[HLP_SOURCE_ENRICH_ENABLED] = "true";

      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), false);
      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
    });

    it("outline-enrich flag: ON does not enable any sibling", () => {
      process.env[HLP_OUTLINE_ENRICH_ENABLED] = "true";

      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), false);
      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
    });

    it("draft-format flag: ON does not enable any sibling", () => {
      process.env[HLP_DRAFT_FORMAT_ENABLED] = "true";

      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), false);
      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
    });

    it("seo-harden flag: ON does not enable any sibling", () => {
      process.env[HLP_SEO_HARDEN_ENABLED] = "true";

      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
    });

    it("master flag is independent of per-stage flags", () => {
      // Master ON, all per-stage OFF.
      process.env[HUMAN_LIKE_PIPELINE_ENABLED] = "true";

      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), false);

      // Conversely: per-stage ON, master OFF.
      delete process.env[HUMAN_LIKE_PIPELINE_ENABLED];
      process.env[HLP_SOURCE_ENRICH_ENABLED] = "true";
      process.env[HLP_OUTLINE_ENRICH_ENABLED] = "true";
      process.env[HLP_DRAFT_FORMAT_ENABLED] = "true";
      process.env[HLP_SEO_HARDEN_ENABLED] = "true";

      assert.equal(isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED), false);
      assert.equal(isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), true);
      assert.equal(isFlagEnabled(HLP_SEO_HARDEN_ENABLED), true);
    });

    it("re-evaluates env on every call (no caching) so a runtime flip is observed", () => {
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      process.env[HLP_DRAFT_FORMAT_ENABLED] = "true";
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), true);
      process.env[HLP_DRAFT_FORMAT_ENABLED] = "false";
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
      delete process.env[HLP_DRAFT_FORMAT_ENABLED];
      assert.equal(isFlagEnabled(HLP_DRAFT_FORMAT_ENABLED), false);
    });

    it("only the case-insensitive string 'true' enables a flag", () => {
      const truthyVariants = ["true", "TRUE", "True", "tRuE"];
      const falsyVariants = ["", "false", "False", "FALSE", "1", "yes", "TRUEISH", " true"];

      for (const v of truthyVariants) {
        process.env[HLP_SEO_HARDEN_ENABLED] = v;
        assert.equal(
          isFlagEnabled(HLP_SEO_HARDEN_ENABLED),
          true,
          `expected ${JSON.stringify(v)} to enable the flag`
        );
      }
      for (const v of falsyVariants) {
        process.env[HLP_SEO_HARDEN_ENABLED] = v;
        assert.equal(
          isFlagEnabled(HLP_SEO_HARDEN_ENABLED),
          false,
          `expected ${JSON.stringify(v)} NOT to enable the flag`
        );
      }
    });
  });

  /**
   * Source-level gating verification.
   * -----------------------------------
   * For each per-stage flag, the wiring task introduced exactly one
   * `isFlagEnabled(<flag>)` guard at the call-site of the new branch.
   * Asserting that the guard literally exists in the wiring file
   * proves that when the flag is OFF the new branch is unreachable —
   * the disabled stage matches the rollback baseline. Asserting the
   * absence of any *other* per-stage flag in the same call-site proves
   * the gates are isolated from each other.
   */
  describe("Each stage's wiring file gates only on its own flag", () => {
    it("HLP_SOURCE_ENRICH_ENABLED gates Source Enrichment in wizardController.js", async () => {
      const src = await readSource(WIZARD_CONTROLLER_PATH);

      // The gate exists.
      assert.match(
        src,
        /isFlagEnabled\(\s*HLP_SOURCE_ENRICH_ENABLED\s*\)/,
        "wizardController.js must guard Source Enrichment scheduling on HLP_SOURCE_ENRICH_ENABLED"
      );

      // The gated call to enrichSelectedSources only happens inside a
      // `shouldEnrich` branch that includes the flag check.
      assert.match(
        src,
        /shouldEnrich[\s\S]{0,200}isFlagEnabled\(\s*HLP_SOURCE_ENRICH_ENABLED\s*\)/,
        "shouldEnrich must include isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED)"
      );
    });

    it("HLP_OUTLINE_ENRICH_ENABLED gates Outline Enricher in wizardController.js", async () => {
      const src = await readSource(WIZARD_CONTROLLER_PATH);

      assert.match(
        src,
        /isFlagEnabled\(\s*HLP_OUTLINE_ENRICH_ENABLED\s*\)/,
        "wizardController.js must guard Outline Enricher invocation on HLP_OUTLINE_ENRICH_ENABLED"
      );

      // The prepareOutlineContext call must live inside the flag-gated
      // branch. Search for the gate immediately preceding the call.
      assert.match(
        src,
        /isFlagEnabled\(\s*HLP_OUTLINE_ENRICH_ENABLED\s*\)[\s\S]{0,400}prepareOutlineContext\(/,
        "prepareOutlineContext must be called only inside the HLP_OUTLINE_ENRICH_ENABLED gate"
      );
    });

    it("HLP_DRAFT_FORMAT_ENABLED gates the Draft Formatter in draftService.js", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);

      assert.match(
        src,
        /isFlagEnabled\(\s*HLP_DRAFT_FORMAT_ENABLED\s*\)/,
        "draftService.js must guard the Draft Formatter on HLP_DRAFT_FORMAT_ENABLED"
      );

      // The formatDraftHtml call must live inside the flag-gated branch.
      assert.match(
        src,
        /isFlagEnabled\(\s*HLP_DRAFT_FORMAT_ENABLED\s*\)[\s\S]{0,300}formatDraftHtml\(/,
        "formatDraftHtml must be called only inside the HLP_DRAFT_FORMAT_ENABLED gate"
      );
    });

    it("HLP_SEO_HARDEN_ENABLED gates the SEO hardened path in seoService.js", async () => {
      const src = await readSource(SEO_SERVICE_PATH);

      // The flag is read once per invocation (Req 6.9) and threaded as
      // `hardenEnabled`; both the read and the branch must exist.
      assert.match(
        src,
        /isFlagEnabled\(\s*["']HLP_SEO_HARDEN_ENABLED["']\s*\)/,
        "seoService.js must read the HLP_SEO_HARDEN_ENABLED flag at runtime"
      );
      assert.match(
        src,
        /if\s*\(\s*hardenEnabled\s*\)\s*\{/,
        "seoService.js must branch on the hardenEnabled flag value"
      );
    });
  });

  /**
   * Cross-stage isolation: each wiring file references at most its own
   * per-stage flag (plus, where applicable, the master). The Source and
   * Outline gates live in wizardController.js, so that file is allowed
   * to mention BOTH; the draft-format and SEO gates each live in their
   * own service file and must not mention any sibling stage's flag.
   */
  describe("No stage's wiring file references a sibling stage's flag", () => {
    it("draftService.js does NOT reference HLP_SOURCE_ENRICH_ENABLED, HLP_OUTLINE_ENRICH_ENABLED, or HLP_SEO_HARDEN_ENABLED", async () => {
      const src = await readSource(DRAFT_SERVICE_PATH);

      assert.doesNotMatch(
        src,
        /HLP_SOURCE_ENRICH_ENABLED/,
        "draftService.js must not reference HLP_SOURCE_ENRICH_ENABLED"
      );
      assert.doesNotMatch(
        src,
        /HLP_OUTLINE_ENRICH_ENABLED/,
        "draftService.js must not reference HLP_OUTLINE_ENRICH_ENABLED"
      );
      assert.doesNotMatch(
        src,
        /HLP_SEO_HARDEN_ENABLED/,
        "draftService.js must not reference HLP_SEO_HARDEN_ENABLED"
      );
    });

    it("seoService.js does NOT reference HLP_SOURCE_ENRICH_ENABLED, HLP_OUTLINE_ENRICH_ENABLED, or HLP_DRAFT_FORMAT_ENABLED", async () => {
      const src = await readSource(SEO_SERVICE_PATH);

      assert.doesNotMatch(
        src,
        /HLP_SOURCE_ENRICH_ENABLED/,
        "seoService.js must not reference HLP_SOURCE_ENRICH_ENABLED"
      );
      assert.doesNotMatch(
        src,
        /HLP_OUTLINE_ENRICH_ENABLED/,
        "seoService.js must not reference HLP_OUTLINE_ENRICH_ENABLED"
      );
      assert.doesNotMatch(
        src,
        /HLP_DRAFT_FORMAT_ENABLED/,
        "seoService.js must not reference HLP_DRAFT_FORMAT_ENABLED"
      );
    });

    it("wizardController.js does NOT reference HLP_DRAFT_FORMAT_ENABLED or HLP_SEO_HARDEN_ENABLED", async () => {
      // wizardController is the call-site for source + outline gates,
      // so it legitimately references those two flag names. The draft
      // and SEO stages run in their own services and the controller
      // must not leak their flags into its decision tree.
      const src = await readSource(WIZARD_CONTROLLER_PATH);

      assert.doesNotMatch(
        src,
        /HLP_DRAFT_FORMAT_ENABLED/,
        "wizardController.js must not reference HLP_DRAFT_FORMAT_ENABLED"
      );
      assert.doesNotMatch(
        src,
        /HLP_SEO_HARDEN_ENABLED/,
        "wizardController.js must not reference HLP_SEO_HARDEN_ENABLED"
      );
    });
  });
});
