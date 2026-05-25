import express from "express";

/**
 * v1 API aggregator.
 *
 * Mount each feature module router here as you build it.
 *
 * Example:
 *   import { authRouter } from "#routes/v1/auth/authRoute.js";
 *   import { articleRouter } from "#routes/v1/article/articleRoute.js";
 *
 *   apiRouterV1.use("/v1", authRouter);
 *   apiRouterV1.use("/v1", articleRouter);
 */
export const apiRouterV1 = express.Router();

// No feature routers wired yet — keep the router empty until you add modules.
// (Express 5 rejects empty handler arrays, so we just don't call `.use` here.)

export default apiRouterV1;
