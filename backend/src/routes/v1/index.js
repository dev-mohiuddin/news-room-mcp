import express from "express";
import { authRouter } from "#routes/v1/auth/authRoute.js";
import { roleRouter } from "#routes/v1/role/roleRoute.js";
import { adminUserRouter, userSelfRouter } from "#routes/v1/user/userRoute.js";
import { teamRouter } from "#routes/v1/team/teamRoute.js";
import { auditRouter } from "#routes/v1/audit/auditRoute.js";
import { articleRouter } from "#routes/v1/article/articleRoute.js";
import { wizardRouter } from "#routes/v1/article/wizardRoute.js";
import { brandVoiceRouter } from "#routes/v1/article/brandVoiceRoute.js";
import { researchRouter } from "#routes/v1/article/researchRoute.js";
import { seoToolsRouter } from "#routes/v1/article/seoToolsRoute.js";
import { templateRouter } from "#routes/v1/article/templateRoute.js";
import { cmsRouter } from "#routes/v1/cms/cmsRoute.js";
import { adminContentRouter } from "#routes/v1/admin/contentRoute.js";
import { notificationRouter } from "#routes/v1/notification/notificationRoute.js";
import { planRouter } from "#routes/v1/billing/planRoute.js";
import { billingRouter } from "#routes/v1/billing/billingRoute.js";
import { settingsRouter } from "#routes/v1/system/settingsRoute.js";
import { integrationRouter } from "#routes/v1/system/integrationRoute.js";
import { supportRouter } from "#routes/v1/support/supportRoute.js";
import { analyticsRouter } from "#routes/v1/analytics/analyticsRoute.js";

/**
 * v1 API aggregator. All feature routers mount at /api/v1.
 */
export const apiRouterV1 = express.Router();

apiRouterV1.use("/v1", authRouter);
apiRouterV1.use("/v1", roleRouter);
apiRouterV1.use("/v1", adminUserRouter);
apiRouterV1.use("/v1", userSelfRouter);
apiRouterV1.use("/v1", teamRouter);
apiRouterV1.use("/v1", auditRouter);
apiRouterV1.use("/v1", articleRouter);

/**
 * Wizard router — feature-flagged. When ENABLE_WIZARD_BACKEND=true, the
 * router mounts and the multi-step wizard endpoints become reachable.
 * When the flag is unset/false, requests fall through to a 404 keeping
 * the legacy `POST /articles/generate` flow as the only generation path.
 */
if (process.env.ENABLE_WIZARD_BACKEND === "true") {
  apiRouterV1.use("/v1", wizardRouter);
}
apiRouterV1.use("/v1", brandVoiceRouter);
apiRouterV1.use("/v1", researchRouter);
apiRouterV1.use("/v1", seoToolsRouter);
apiRouterV1.use("/v1", templateRouter);
apiRouterV1.use("/v1", cmsRouter);
apiRouterV1.use("/v1", adminContentRouter);
apiRouterV1.use("/v1", notificationRouter);
apiRouterV1.use("/v1", planRouter);
apiRouterV1.use("/v1", billingRouter);
apiRouterV1.use("/v1", settingsRouter);
apiRouterV1.use("/v1", integrationRouter);
apiRouterV1.use("/v1", supportRouter);
apiRouterV1.use("/v1", analyticsRouter);

export default apiRouterV1;
