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
import { globalErrorHandler } from "#middlewares/globalErrorHandlerMiddleware.js";
import { securityMiddleware } from "#middlewares/securityMiddleware.js";
import { notFoundHandler } from "#middlewares/notFoundHandlerMiddleware.js";
import { globalRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import { requestLogger } from "#middlewares/loggingMiddleware.js";
import { apiRouterV1 } from "#routes/v1/index.js";
import healthRouter from "#routes/v1/health/healthRoute.js";
import { setupSwagger } from "#config/swagger.js";
import { startDailyProfitJob } from "#jobs/dailyProfitJob.js";
import { configureCloudinary } from "#utils/cloudinaryUtil.js";

dotenv.config();
try {
  configureCloudinary();
} catch (error) {
  console.error("Cloudinary configuration error:", error.message);
  console.warn("File uploads will not work until Cloudinary is configured.");
}
const PORT = process.env.PORT || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../client/dist");
const shouldServeClientDist = process.env.SERVE_CLIENT_DIST === "true";
const canServeClientDist = shouldServeClientDist && existsSync(clientDistPath);

// ==========================================
// STATIC FILES — served at top to avoid
// middleware interference with assets
// ==========================================
if (canServeClientDist) {
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );
}

if (shouldServeClientDist && !canServeClientDist) {
  console.warn(`Client dist not found at ${clientDistPath}. SPA fallback is disabled.`);
}

// ==========================================
// API MIDDLEWARE
// ==========================================
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachRequestId);
app.use(requestLogger);
app.use(securityMiddleware);
app.use(globalResponse);
app.use(globalRateLimiter(1000, 15));

setupSwagger(app);

app.use("/api", apiRouterV1);
app.use("/api/health", healthRouter);

// ==========================================
// SPA FALLBACK — any non-API route serves index.html
// ==========================================
if (canServeClientDist) {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("ShareBit server is running...");
  });
}

app.use(notFoundHandler);
app.use(globalErrorHandler);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

const startServer = async () => {
  await connectDatabase();

  startDailyProfitJob();

  const response = server.listen(PORT, () => {
    const origins = getAllowedOrigins();
    const originLabel = origins.length ? origins.join(", ") : "dynamic/all origins (default)";
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS origin mode: ${originLabel}`);
    if (canServeClientDist) {
      console.log(`Serving client dist from ${clientDistPath}`);
    }
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    response.close(() => process.exit(1));
  });
};

startServer();
