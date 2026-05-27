import * as seoTools from "#services/article/seoToolsService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* POST /api/v1/seo/meta */
export const generateMetaHandler = catchAsync(async (req, res) => {
  const data = await seoTools.generateMeta(req.body);
  res.success({ data, message: "Meta assets generated" });
});

/* POST /api/v1/seo/slug — synchronous, deterministic */
export const generateSlugHandler = catchAsync(async (req, res) => {
  const data = seoTools.generateSlug(req.body);
  res.success({ data, message: "Slug suggestions" });
});

/* POST /api/v1/seo/faq */
export const generateFaqHandler = catchAsync(async (req, res) => {
  const data = await seoTools.generateFaq(req.body);
  res.success({ data, message: `Generated ${data.faqs.length} FAQ pairs` });
});

/* POST /api/v1/seo/keyword */
export const analyzeKeywordHandler = catchAsync(async (req, res) => {
  const data = await seoTools.analyzeKeyword(req.body);
  res.success({ data, message: "Keyword analyzed" });
});
