import { catchAsync } from "#utils/catchAsync.js";
import { throwError } from "#utils/throwErrorUtil.js";
import {
  findActiveArticleById,
  updateArticleFields,
  appendCostStage,
} from "#repositories/articleRepository.js";
import { generateSocialPack } from "#services/article/socialRepurposeService.js";
import {
  generateImageBrief,
  searchHeroImageOnUnsplash,
  ingestAndStoreImage,
  SUPPORTED_MIMES,
} from "#services/article/featuredImageService.js";

/**
 * On-demand Phase B agent endpoints. Mounted under /articles/:id/...
 *
 *   POST /articles/:id/social-pack          → B4 social repurposer
 *   POST /articles/:id/featured-image/brief → B7 image-prompt engineer
 *   GET  /articles/:id/featured-image/unsplash?query=... → B7 search
 *   POST /articles/:id/featured-image/select  → B7 ingest chosen Unsplash image
 *   POST /articles/:id/featured-image/upload → B7 multer upload
 */

/* ── B4: Social Repurposer ─────────────────────────────── */
export const generateSocial = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);
  if (!article.contentMarkdown && !article.contentHtml) {
    throwError("Article has no body content yet", 409);
  }

  const result = await generateSocialPack({
    article,
    articleUrl: article.cmsPostUrl || null,
  });

  await updateArticleFields(workspaceId, req.params.id, {
    socialPosts: { ...result.pack, generatedAt: new Date() },
  });
  if (result.cost) {
    await appendCostStage(workspaceId, req.params.id, result.cost);
  }

  res.success({
    data: { ...result.pack, generatedAt: new Date() },
    message: "Social pack generated",
  });
});

/* ── B7: Image brief ───────────────────────────────────── */
export const generateImageBriefHandler = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  const result = await generateImageBrief({ article });
  if (result.cost) {
    await appendCostStage(workspaceId, req.params.id, result.cost);
  }
  res.success({ data: result.brief, message: "Image brief generated" });
});

/* ── B7: Unsplash search ───────────────────────────────── */
export const unsplashSearch = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  const query = String(
    req.query.query || article.targetKeyword || article.topic || ""
  ).trim();
  if (!query) throwError("Search query required", 400);
  const results = await searchHeroImageOnUnsplash({ query });
  res.success({ data: results, message: "Unsplash results" });
});

/* ── B7: Select Unsplash image ─────────────────────────── */
export const selectUnsplashImage = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  const { imageUrl, alt, photographerName, photographerUrl } = req.body || {};
  if (!imageUrl) throwError("imageUrl is required", 400);

  const stored = await ingestAndStoreImage({
    workspaceId,
    imageUrl,
    source: "unsplash",
    alt: alt || "",
    attribution:
      photographerName || photographerUrl
        ? { photographerName, photographerUrl }
        : null,
  });

  await updateArticleFields(workspaceId, req.params.id, {
    featuredImage: stored,
  });
  res.success({ data: stored, message: "Featured image set" });
});

/* ── B7: File upload ───────────────────────────────────── */
export const uploadFeaturedImage = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);
  const file = req.file;
  if (!file) throwError("File is required", 400);
  if (!SUPPORTED_MIMES.includes(file.mimetype)) {
    throwError("Unsupported image type — must be JPEG/PNG/WebP", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    throwError("Image exceeds 10MB limit", 400);
  }

  const stored = await ingestAndStoreImage({
    workspaceId,
    buffer: file.buffer,
    source: "upload",
    alt: req.body?.alt || "",
  });

  await updateArticleFields(workspaceId, req.params.id, {
    featuredImage: stored,
  });
  res.success({ data: stored, message: "Featured image uploaded" });
});
