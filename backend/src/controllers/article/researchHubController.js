import * as researchHub from "#services/article/researchHubService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* POST /api/v1/research/search */
export const searchTopicHandler = catchAsync(async (req, res) => {
  const data = await researchHub.searchTopic(req.body);
  res.success({
    data,
    message: `Found ${data.sources.length} sources`,
  });
});

/* POST /api/v1/research/summarize */
export const summarizeSourcesHandler = catchAsync(async (req, res) => {
  const data = await researchHub.summarizeSelected(req.body);
  res.success({
    data,
    message: "Research brief generated",
  });
});

/* POST /api/v1/research/brief — alias kept for the existing
 * frontend client which calls /research/brief. We treat it as
 * "summarize selected sources into a brief". */
export const generateBriefHandler = summarizeSourcesHandler;
