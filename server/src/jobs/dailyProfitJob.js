import cron from "node-cron";
import { runDailyProfitDistribution } from "#services/profit/profitEngineService.js";

export const startDailyProfitJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await runDailyProfitDistribution(new Date());
    } catch (err) {
      console.error("Daily profit job failed:", err.message);
    }
  });
};
