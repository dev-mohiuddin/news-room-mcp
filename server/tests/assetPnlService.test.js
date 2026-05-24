import test from "node:test";
import assert from "node:assert/strict";
import { computeMonthlyPnlStatement } from "#services/profit/assetPnlService.js";

test("computeMonthlyPnlStatement returns distributable profit when net covers carry loss", () => {
  const result = computeMonthlyPnlStatement({
    grossProfit: 1000,
    totalExpense: 200,
    carryInLoss: 150,
  });

  assert.equal(result.grossProfit, 1000);
  assert.equal(result.totalExpense, 200);
  assert.equal(result.carryInLoss, 150);
  assert.equal(result.distributableProfit, 650);
  assert.equal(result.carryOutLoss, 0);
  assert.equal(result.netAfterExpense, 800);
});

test("computeMonthlyPnlStatement carries forward remaining loss when net is negative", () => {
  const result = computeMonthlyPnlStatement({
    grossProfit: 300,
    totalExpense: 500,
    carryInLoss: 120,
  });

  assert.equal(result.grossProfit, 300);
  assert.equal(result.totalExpense, 500);
  assert.equal(result.carryInLoss, 120);
  assert.equal(result.distributableProfit, 0);
  assert.equal(result.carryOutLoss, 320);
  assert.equal(result.netAfterExpense, -200);
});

test("computeMonthlyPnlStatement rounds currency to two decimals", () => {
  const result = computeMonthlyPnlStatement({
    grossProfit: 1000.019,
    totalExpense: 100.005,
    carryInLoss: 0.004,
  });

  assert.equal(result.grossProfit, 1000.02);
  assert.equal(result.totalExpense, 100.01);
  assert.equal(result.carryInLoss, 0);
  assert.equal(result.distributableProfit, 900.01);
  assert.equal(result.carryOutLoss, 0);
});
