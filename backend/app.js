import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";

import { app, server } from "#socket/server.js";
import { connectDatabase } from "#config/dbConnect.js";
import { getAllowedOrigins } from "#config/corsConfig.js";

import { attachRequestId, globalResponse } from "#utils/responseUtil.js";
import { logger } from "#utils/logger.js";
import { configureCloudinary } from "#utils/cloudinaryUtil.js";

import { globalErrorHandler } from "#middlewares/globalErrorHandlerMiddleware.js";
import { securityMiddleware } from "#middlewares/securityMiddleware.js";
import { notFoundHandler } from "#middlewares/notFoundHandlerMiddleware.js";
import { globalRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import { requestLogger } from "#middlewares/loggingMiddleware.js";

import { apiRouterV1 } from "#routes/v1/index.js";
import healthRouter from "#routes/v1/health/healthRoute.js";
import { stripeWebhookRouter } from "#routes/v1/billing/stripeWebhookRoute.js";
import { maintenanceGuard } from "#middlewares/maintenanceMiddleware.js";

import { setupSwagger } from "#config/swagger.js";
import { startBackgroundJobs } from "#jobs/index.js";

dotenv.config();

// --- Cloudinary (optional — skip if not configured) ---
try {
  configureCloudinary();
  logger.info("Cloudinary configured");
} catch (err) {
  logger.warn(`Cloudinary not configured: ${err.message}`);
}

const PORT = process.env.PORT || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Optional SPA serving (if you want backend to serve frontend dist) ---
const clientDistPath = path.resolve(__dirname, "../frontend/dist");
const shouldServeClientDist = process.env.SERVE_CLIENT_DIST === "true";
const canServeClientDist = shouldServeClientDist && existsSync(clientDistPath);

// ==========================================
// STATIC FILES (served first to avoid middleware interference)
// ==========================================
if (canServeClientDist) {
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    })
  );
}

if (shouldServeClientDist && !canServeClientDist) {
  logger.warn(
    `Client dist not found at ${clientDistPath}. SPA fallback disabled.`
  );
}

// ==========================================
// STRIPE WEBHOOK — MUST be mounted BEFORE express.json() so the raw
// request body is preserved for signature verification.
// ==========================================
app.use(stripeWebhookRouter);

// ==========================================
// API MIDDLEWARE STACK
// ==========================================
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(attachRequestId);
app.use(requestLogger);
app.use(securityMiddleware);
app.use(globalResponse);
app.use(globalRateLimiter(1000, 15));

// ==========================================
// ROUTES
// ==========================================
setupSwagger(app);

app.use("/api/health", healthRouter);
app.use("/api", maintenanceGuard);
app.use("/api", apiRouterV1);

// ==========================================
// SPA FALLBACK
// ==========================================
if (canServeClientDist) {
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send("Newsroom MCP backend is running");
  });
}

// ==========================================
// ERROR HANDLERS (always last)
// ==========================================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ==========================================
// PROCESS-LEVEL ERROR HANDLERS
// ==========================================
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

const startServer = async () => {
  await connectDatabase();
  startBackgroundJobs();

  const httpServer = server.listen(PORT, () => {
    const origins = getAllowedOrigins();
    const originLabel = origins.length
      ? origins.join(", ")
      : "default (localhost)";
    logger.info(`Server listening on port ${PORT}`, {
      env: process.env.NODE_ENV || "development",
      cors: originLabel,
      docs: `http://localhost:${PORT}/api/docs`,
    });
    if (canServeClientDist) {
      logger.info(`Serving client dist from ${clientDistPath}`);
    }
  });

  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection", {
      message: err?.message,
      stack: err?.stack,
    });
    httpServer.close(() => process.exit(1));
  });
};

startServer();
