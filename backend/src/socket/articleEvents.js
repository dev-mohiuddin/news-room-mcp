import { emitToWorkspace } from "#socket/server.js";

/**
 * ============================================================
 *  Article progress events — Requirement 13.3 / 13.4 / 13.5
 * ============================================================
 *
 *   - article:progress  → during stage transitions (research → originality)
 *   - article:done      → on draft_ready or published
 *   - article:failed    → on failed or needs_revision
 */

export const emitProgress = ({ workspaceId, articleId, status, stage, percent }) => {
  emitToWorkspace(workspaceId, "article:progress", {
    articleId: String(articleId),
    status,
    stage,
    percent,
    timestamp: new Date().toISOString(),
  });
};

export const emitDone = ({ workspaceId, articleId, status }) => {
  emitToWorkspace(workspaceId, "article:done", {
    articleId: String(articleId),
    status,
    percent: 100,
    timestamp: new Date().toISOString(),
  });
};

export const emitFailed = ({ workspaceId, articleId, status, failureReason }) => {
  emitToWorkspace(workspaceId, "article:failed", {
    articleId: String(articleId),
    status,
    failureReason,
    timestamp: new Date().toISOString(),
  });
};
