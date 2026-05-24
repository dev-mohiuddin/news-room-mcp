import test from "node:test";
import assert from "node:assert/strict";
import { calculateDailyShareProfit } from "#services/profit/profitEngineService.js";

const approx = (value, expected, tolerance = 0.0001) => {
  assert.ok(Math.abs(value - expected) <= tolerance);
};

test("calculateDailyShareProfit distributes proportional profit", () => {
  const result = calculateDailyShareProfit({
    monthlyProfit: 30000,
    totalShares: 100,
    daysInMonth: 30,
    totalPaid: 20000,
    sharePrice: 30000,
  });

  approx(result.dailyProfitPerShare, 10);
  approx(result.userRatio, 2 / 3);
  approx(result.companyRatio, 1 / 3);
  approx(result.userProfit, 10 * (2 / 3));
  approx(result.companyProfit, 10 * (1 / 3));
});

test("calculateDailyShareProfit returns full user profit when fully paid", () => {
  const result = calculateDailyShareProfit({
    monthlyProfit: 30000,
    totalShares: 100,
    daysInMonth: 30,
    totalPaid: 30000,
    sharePrice: 30000,
  });

  approx(result.userRatio, 1);
  approx(result.companyRatio, 0);
  approx(result.userProfit, 10);
  approx(result.companyProfit, 0);
});

test("calculateDailyShareProfit returns company profit when unpaid", () => {
  const result = calculateDailyShareProfit({
    monthlyProfit: 30000,
    totalShares: 100,
    daysInMonth: 30,
    totalPaid: 0,
    sharePrice: 30000,
  });

  approx(result.userRatio, 0);
  approx(result.companyRatio, 1);
  approx(result.userProfit, 0);
  approx(result.companyProfit, 10);
});
