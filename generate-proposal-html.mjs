// Converts NEWSROOM_MCP_PROPOSAL.md → NEWSROOM_MCP_PROPOSAL.html
// HTML can be opened in Word (File → Open) and saved as .docx
// Run: node generate-proposal-html.mjs

import fs from "node:fs";
import path from "node:path";

const md = fs.readFileSync("NEWSROOM_MCP_PROPOSAL.md", "utf8");

// Minimal markdown → HTML converter (sufficient for our doc structure)
function mdToHtml(src) {
  let html = src;

  // Code fences
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Headings
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");

  // Tables
  html = html.replace(/\|(.+)\|\n\|([-:\s|]+)\|\n((?:\|.+\|\n?)+)/g, (_, headerLine, _sep, body) => {
    const headers = headerLine.split("|").map((c) => c.trim()).filter(Boolean);
    const rows = body.trim().split("\n").map((line) =>
      line.split("|").map((c) => c.trim()).filter(Boolean)
    );

    let table = `<table><thead><tr>${headers.map((h) => `<th>${inlineMd(h)}</th>`).join("")}</tr></thead><tbody>`;
    rows.forEach((row) => {
      table += `<tr>${row.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`;
    });
    table += "</tbody></table>";
    return table;
  });

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr/>");

  // Lists (numbered)
  html = html.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>\n?)+/g, (match) => {
    if (match.includes("<ol")) return match;
    return `<ol>${match}</ol>`;
  });

  // Lists (bulleted) — handle both - and *
  html = html.replace(/^[-*] (.+)$/gm, "<bli>$1</bli>");
  html = html.replace(/(<bli>[\s\S]+?<\/bli>\n?)+/g, (match) => {
    return `<ul>${match.replace(/<bli>/g, "<li>").replace(/<\/bli>/g, "</li>")}</ul>`;
  });
  html = html.replace(/<bli>/g, "<li>").replace(/<\/bli>/g, "</li>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Inline markdown
  html = html.split("\n").map((line) => {
    if (/^<(h[1-6]|table|ul|ol|li|pre|hr|blockquote)/i.test(line.trim())) return line;
    if (/^<\//.test(line.trim())) return line;
    return inlineMd(line);
  }).join("\n");

  // Paragraphs — wrap consecutive non-tag lines
  html = html.replace(/(?:^|\n)([^\n<].+(?:\n[^\n<].+)*)/g, (match, content) => {
    if (!content.trim()) return match;
    return `\n<p>${content.replace(/\n/g, " ")}</p>`;
  });

  return html;
}

function inlineMd(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Newsroom MCP — Project Proposal</title>
<style>
  @page { size: A4; margin: 2.5cm 2cm; }
  body {
    font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    line-height: 1.65;
    color: #1a1a2e;
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #ffffff;
  }
  h1 {
    font-size: 32px;
    color: #1a1a2e;
    border-bottom: 3px solid #3B82F6;
    padding-bottom: 10px;
    margin-top: 40px;
    page-break-before: auto;
  }
  h1:first-of-type { page-break-before: avoid; }
  h2 {
    font-size: 24px;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 32px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 18px;
    color: #334155;
    margin-top: 24px;
    page-break-after: avoid;
  }
  h4 {
    font-size: 15px;
    color: #475569;
    margin-top: 18px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  p { margin: 0.7em 0; text-align: justify; }
  strong { color: #0f172a; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 13px;
    page-break-inside: avoid;
  }
  th {
    background: #f1f5f9;
    color: #1e293b;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    font-weight: 600;
  }
  td {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  pre {
    background: #f1f5f9;
    border-left: 4px solid #8B5CF6;
    padding: 14px 18px;
    overflow-x: auto;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
    page-break-inside: avoid;
  }
  code {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    background: #f1f5f9;
    color: #7c3aed;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  pre code { background: none; color: #0f172a; padding: 0; }
  blockquote {
    border-left: 4px solid #2DD4BF;
    background: #f0fdfa;
    margin: 16px 0;
    padding: 12px 18px;
    color: #0f766e;
    font-style: italic;
  }
  hr {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 32px 0;
  }
  ul, ol {
    margin: 8px 0;
    padding-left: 28px;
  }
  li { margin: 4px 0; }
  a { color: #3B82F6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .cover {
    text-align: center;
    padding: 80px 20px;
    page-break-after: always;
  }
  .cover h1 {
    font-size: 48px;
    border: none;
    background: linear-gradient(135deg, #3B82F6, #8B5CF6, #2DD4BF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  .cover .subtitle {
    font-size: 22px;
    color: #475569;
    margin-bottom: 60px;
  }
  @media print {
    body { padding: 0; }
    h1 { page-break-before: always; }
    h1:first-of-type { page-break-before: avoid; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync("NEWSROOM_MCP_PROPOSAL.html", html, "utf8");
console.log("✓ Generated NEWSROOM_MCP_PROPOSAL.html");
console.log(`  Size: ${(fs.statSync("NEWSROOM_MCP_PROPOSAL.html").size / 1024).toFixed(1)} KB`);
console.log("");
console.log("To convert to .docx:");
console.log("  1. Open Word");
console.log("  2. File → Open → select NEWSROOM_MCP_PROPOSAL.html");
console.log("  3. File → Save As → choose .docx format");
