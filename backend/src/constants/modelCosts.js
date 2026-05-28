/**
 * ============================================================
 *  Anthropic Model Cost Table — Requirement 17
 * ============================================================
 *
 *  inputPer1k  — USD per 1,000 input (prompt) tokens
 *  outputPer1k — USD per 1,000 output (completion) tokens
 *
 *  Update this table when Anthropic changes published pricing.
 *  Unknown models do not crash; the stage marks `costFlagged = true`
 *  and emits a warning log. See Requirement 17 criterion 5.
 */

export const MODEL_COST_TABLE = Object.freeze({
  // Sonnet 4.5 — current primary writing engine (published pricing)
  "claude-sonnet-4-5-20250929": { inputPer1k: 0.003, outputPer1k: 0.015 },

  // Sonnet 4 — kept for backwards compatibility with older logs
  "claude-sonnet-4-20250514": { inputPer1k: 0.003, outputPer1k: 0.015 },

  // Haiku 4.5 — fast/low-cost (SEO assets, alt text, research bullets)
  "claude-haiku-4-5-20251001": { inputPer1k: 0.0008, outputPer1k: 0.004 },

  // Sonnet 3.5 (older, fallback)
  "claude-3-5-sonnet-20241022": { inputPer1k: 0.003, outputPer1k: 0.015 },
});

/**
 * Compute USD cost for a token usage report.
 * Returns `{ usdCost, flagged }`. `usdCost` is rounded to 6 decimals.
 */
export const computeUsdCost = (model, promptTokens = 0, completionTokens = 0) => {
  const entry = MODEL_COST_TABLE[model];
  if (!entry) {
    return { usdCost: 0, flagged: true };
  }
  const cost =
    (Number(promptTokens) || 0) * (entry.inputPer1k / 1000) +
    (Number(completionTokens) || 0) * (entry.outputPer1k / 1000);
  return { usdCost: Number(cost.toFixed(6)), flagged: false };
};

export const roundUsd = (value) => Number(Number(value || 0).toFixed(6));
