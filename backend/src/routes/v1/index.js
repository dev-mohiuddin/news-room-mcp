import express from "express";
import { authRouter } from "#routes/v1/auth/authRoute.js";
import { roleRouter } from "#routes/v1/role/roleRoute.js";
import { adminUserRouter } from "#routes/v1/user/userRoute.js";
import { teamRouter } from "#routes/v1/team/teamRoute.js";
import { auditRouter } from "#routes/v1/audit/auditRoute.js";
import { articleRouter } from "#routes/v1/article/articleRoute.js";
import { brandVoiceRouter } from "#routes/v1/article/brandVoiceRoute.js";
import { cmsRouter } from "#routes/v1/cms/cmsRoute.js";
import { adminContentRouter } from "#routes/v1/admin/contentRoute.js";

/**
 * v1 API aggregator. All feature routers mount at /api/v1.
 */
export const apiRouterV1 = express.Router();

apiRouterV1.use("/v1", authRouter);
apiRouterV1.use("/v1", roleRouter);
apiRouterV1.use("/v1", adminUserRouter);
apiRouterV1.use("/v1", teamRouter);
apiRouterV1.use("/v1", auditRouter);
apiRouterV1.use("/v1", articleRouter);
apiRouterV1.use("/v1", brandVoiceRouter);
apiRouterV1.use("/v1", cmsRouter);
apiRouterV1.use("/v1", adminContentRouter);

export default apiRouterV1;
