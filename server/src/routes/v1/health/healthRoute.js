import express from "express";
import os from "os";
import si from "systeminformation";
import { catchAsync } from "#utils/catchAsync.js";

const router = express.Router();

const bytesToMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const bytesToGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);

// /api/health
router.get(
  "/",
  catchAsync(async (req, res) => {
    // Memory
    const totalMemMB = bytesToMB(os.totalmem());
    const freeMemMB = bytesToMB(os.freemem());
    const usedMemMB = (totalMemMB - freeMemMB).toFixed(2);
    const memUsagePercent = ((usedMemMB / totalMemMB) * 100).toFixed(2);

    // CPU
    const cpuLoad = await si.currentLoad();
    const cpuInfo = await si.cpu();

    // GPU
    let gpuInfo = [];
    try {
      gpuInfo = await si.graphics();
    } catch (err) {
      gpuInfo = { controllers: [] };
    }

    // Disk
    const diskInfo = await si.fsSize();
    const totalDiskGB = bytesToGB(diskInfo.reduce((acc, disk) => acc + disk.size, 0));
    const usedDiskGB = bytesToGB(diskInfo.reduce((acc, disk) => acc + disk.used, 0));
    const freeDiskGB = (totalDiskGB - usedDiskGB).toFixed(2);
    const diskUsagePercent = ((usedDiskGB / totalDiskGB) * 100).toFixed(2);

    // Network
    const networkInterfaces = await si.networkInterfaces();
    const networkStats = await si.networkStats();

    // OS Info
    const osInfo = await si.osInfo();

    // Process Info
    const processMemory = process.memoryUsage();
    const activeHandles = process._getActiveHandles().length;
    const eventLoopDelay = await si.services("node");

    const healthData = {
      status: "UP",
      uptime: process.uptime().toFixed(0) + "s",
      timestamp: new Date().toISOString(),
      memory: {
        totalMB: totalMemMB,
        usedMB: usedMemMB,
        usagePercent: memUsagePercent + "%",
      },
      cpu: {
        cores: cpuInfo.cores,
        loadPercent: cpuLoad.currentLoad.toFixed(2) + "%",
      },
      disk: {
        totalGB: totalDiskGB,
        usedGB: usedDiskGB,
        freeGB: freeDiskGB,
        usagePercent: diskUsagePercent + "%",
      },
      process: {
        memoryUsageMB: bytesToMB(processMemory.rss),
        activeHandles,
      },
    };

    res.success({
      data: healthData,
      message: "Health check success",
    });
  })
);

export default router;
