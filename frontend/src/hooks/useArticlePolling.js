import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { getArticleApi } from "@/api/article/article";
import { wizardActions } from "@/redux/slice/wizard-slice";

/**
 * ============================================================
 *  useArticlePolling — Requirement 9.12 (polling fallback)
 * ============================================================
 *
 *  Activates only when `enabled` is true (caller passes the inverse
 *  of `stream.connected`). Polls `GET /articles/:id` every
 *  `intervalMs` (default 8 s ±1 s jitter) and dispatches an
 *  `articleSnapshot` action.
 *
 *  Stops automatically when `enabled` flips to false (i.e. socket
 *  reconnected) — the wizard then resumes live streaming.
 */
export const useArticlePolling = (articleId, { enabled, intervalMs = 8000 } = {}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled || !articleId) return undefined;
    dispatch(wizardActions.streamPolling(true));

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getArticleApi(articleId);
        if (cancelled) return;
        dispatch(wizardActions.articleSnapshot(res?.data || res));
      } catch {
        // Ignore transient errors — next tick will retry.
      }
    };
    // Fire one tick immediately, then on the interval.
    tick();
    const jitter = Math.floor(Math.random() * 2000) - 1000;
    const id = setInterval(tick, intervalMs + jitter);

    return () => {
      cancelled = true;
      clearInterval(id);
      dispatch(wizardActions.streamPolling(false));
    };
  }, [enabled, articleId, intervalMs, dispatch]);
};
