import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Validates: Requirements 7.5
//
// CI gate: the article-drafter persona Markdown must never contain
// fenced code blocks holding JS/TS executable code. The persona is a
// system-prompt document, not a runtime artifact — any code-shaped
// content there suggests a leak between persona authoring and runtime
// constraint plumbing. Tilde-fenced blocks are scanned in addition to
// backtick fences so the check cannot be sidestepped by switching
// fence styles.

const PERSONA_PATH = fileURLToPath(
  new URL(
    "../../src/services/article/personas/article-drafter.md",
    import.meta.url
  )
);

// Tokens that strongly indicate JS/TS executable code rather than
// prose, JSON, plain shell, or HTML. Each pattern uses word boundaries
// or operator anchors to keep false positives low when the keyword is
// genuinely required as English vocabulary in narrative prose.
const FORBIDDEN_KEYWORDS = [
  /\bfunction\s*[a-zA-Z_(]/,
  /\bconst\s+\w+\s*=/,
  /\blet\s+\w+\s*=/,
  /\bvar\s+\w+\s*=/,
  /=>/,
  /\bimport\s+/,
  /\bexport\s+/,
  /\bclass\s+\w+/,
  /\bif\s*\(/,
  /\bfor\s*\(/,
  /\bwhile\s*\(/,
  /\breturn\s+/,
  /\bthrow\s+/,
  /\btry\s*\{/,
  /\basync\s+/,
  /\bawait\s+/,
];

// Languages whose fences are always acceptable — these are documentation
// shapes (plain prose, JSON examples, shell commands, HTML snippets) and
// must never trip the gate even if a keyword happens to appear inside.
const DOCUMENTATION_LANGS = new Set([
  "",
  "text",
  "plaintext",
  "txt",
  "markdown",
  "md",
  "json",
  "jsonc",
  "yaml",
  "yml",
  "html",
  "xml",
  "sh",
  "bash",
  "shell",
  "console",
  "diff",
]);

function collectFencedBlocks(md) {
  const blocks = [];
  // Backtick fences: opening ``` with optional language, then body, then closing ```.
  const backtickRe = /```(\w*)\n([\s\S]*?)\n```/g;
  let m;
  while ((m = backtickRe.exec(md))) {
    blocks.push({ fence: "`", lang: m[1] ?? "", body: m[2] ?? "" });
  }
  // Tilde fences: same shape, ~~~ delimiter.
  const tildeRe = /~~~(\w*)\n([\s\S]*?)\n~~~/g;
  while ((m = tildeRe.exec(md))) {
    blocks.push({ fence: "~", lang: m[1] ?? "", body: m[2] ?? "" });
  }
  return blocks;
}

describe("Persona Markdown — Req 7.5 (no executable code)", () => {
  it("article-drafter.md contains no fenced code blocks with JS/TS keywords", async () => {
    const md = await fs.readFile(PERSONA_PATH, "utf8");
    const blocks = collectFencedBlocks(md);
    const violations = [];

    for (const { fence, lang, body } of blocks) {
      if (DOCUMENTATION_LANGS.has(lang.toLowerCase())) continue;
      for (const kw of FORBIDDEN_KEYWORDS) {
        if (kw.test(body)) {
          violations.push({
            fence,
            lang,
            keyword: kw.toString(),
            bodyPreview: body.slice(0, 120),
          });
          break;
        }
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `article-drafter.md contains executable-code-shaped fenced blocks. ` +
        `Persona files must hold prose only. Violations:\n` +
        JSON.stringify(violations, null, 2)
    );
  });
});
