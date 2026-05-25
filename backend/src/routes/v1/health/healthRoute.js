import express from "express";
import os from "node:os";
import si from "systeminformation";
import { catchAsync } from "#utils/catchAsync.js";

const router = express.Router();

const bytesToMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const bytesToGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);

router.get(
  "/",
  catchAsync(async (req, res) => {
    const totalMemMB = bytesToMB(os.totalmem());
    const freeMemMB = bytesToMB(os.freemem());
    const usedMemMB = (totalMemMB - freeMemMB).toFixed(2);
    const memUsagePercent = ((usedMemMB / totalMemMB) * 100).toFixed(2);

    let cpuLoad = { currentLoad: 0 };
    let cpuInfo = { cores: os.cpus().length };
    let diskInfo = [];

    try {
      cpuLoad = await si.currentLoad();
      cpuInfo = await si.cpu();
      diskInfo = await si.fsSize();
    } catch {
      /* systeminformation can fail in some sandboxed envs */
    }

    const totalDiskGB = bytesToGB(
      diskInfo.reduce((acc, d) => acc + (d.size || 0), 0)
    );
    const usedDiskGB = bytesToGB(
      diskInfo.reduce((acc, d) => acc + (d.used || 0), 0)
    );

    const processMemory = process.memoryUsage();

    const data = {
      status: "UP",
      uptime: process.uptime().toFixed(0) + "s",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      memory: {
        totalMB: totalMemMB,
        usedMB: usedMemMB,
        usagePercent: memUsagePercent + "%",
      },
      cpu: {
        cores: cpuInfo.cores,
        loadPercent: (cpuLoad.currentLoad || 0).toFixed(2) + "%",
      },
      disk: {
        totalGB: totalDiskGB,
        usedGB: usedDiskGB,
      },
      process: {
        memoryUsageMB: bytesToMB(processMemory.rss),
        nodeVersion: process.version,
      },
    };

    res.success({ data, message: "Health check OK" });
  })
);

export default router;
