import { trackArticleViewApi } from "@/api/analytics/analytics";

/**
 * Fire-and-forget view-tracking beacon. Used by:
 *   - the public CMS pixel (sendBeacon)
 *   - the article preview iframe inside the dashboard
 *
 *  Always returns void; we never surface tracking errors to the UI
 *  because they are not user-actionable.
 */
export const trackArticleView = ({ articleId, slug, referrer } = {}) => {
  if (!articleId) return;
  trackArticleViewApi({
    articleId,
    slug,
    referrer: referrer || (typeof document !== "undefined" ? document.referrer : ""),
  }).catch(() => {
    /* swallow */
  });
};
