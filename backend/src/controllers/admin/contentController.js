import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import {
  paginatedAllArticles,
  setArticleHidden,
  setArticleFlagged,
} from "#repositories/articleRepository.js";
import { logAudit } from "#utils/auditLogger.js";

/**
 * ============================================================
 *  Platform-wide content moderation — super admins only
 * ============================================================
 *
 *  GET    /api/v1/admin/articles            → cross-tenant list
 *  PATCH  /api/v1/admin/articles/:id/hide   → soft-hide / unhide
 *  PATCH  /api/v1/admin/articles/:id/flag   → flag / unflag for review
 */

/* GET /admin/articles */
export const listAllArticles = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "wordCount", "status"],
  });

  const filters = {
    status: req.query.status || undefined,
    workspaceId: req.query.workspaceId || undefined,
    flagged: req.query.flagged === "true" ? true : undefined,
    hidden: req.query.hidden === "true" ? true : undefined,
  };

  const { items, meta } = await paginatedAllArticles(params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Articles fetched",
  });
});

/* PATCH /admin/articles/:id/hide  body: { hidden: boolean } */
export const toggleHide = catchAsync(async (req, res) => {
  const hidden = !!req.body.hidden;
  const updated = await setArticleHidden(req.params.id, hidden, req.user?.id);
  if (!updated) throwError("Article not found", 404);

  await logAudit({
    actor: req.user,
    category: "moderation",
    action: hidden ? "article.hidden" : "article.unhidden",
    entityType: "article",
    entityId: updated._id,
    workspaceId: updated.workspaceId,
    after: { moderation: updated.moderation },
    req,
  });

  res.success({
    data: updated,
    message: hidden ? "Article hidden" : "Article visibility restored",
  });
});

/* PATCH /admin/articles/:id/flag  body: { flagged: boolean, reason?: string } */
export const toggleFlag = catchAsync(async (req, res) => {
  const flagged = !!req.body.flagged;
  const reason = req.body.reason || null;
  const updated = await setArticleFlagged(
    req.params.id,
    flagged,
    reason,
    req.user?.id
  );
  if (!updated) throwError("Article not found", 404);

  await logAudit({
    actor: req.user,
    category: "moderation",
    action: flagged ? "article.flagged" : "article.unflagged",
    entityType: "article",
    entityId: updated._id,
    workspaceId: updated.workspaceId,
    after: { moderation: updated.moderation },
    req,
  });

  res.success({
    data: updated,
    message: flagged ? "Article flagged" : "Flag cleared",
  });
});
