import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { getSocket } from "@/lib/socket";
import { wizardActions } from "@/redux/slice/wizard-slice";
import { getStageChunksApi } from "@/api/article/wizard";

/**
 * ============================================================
 *  useWizardStream — Requirement 9 (Stream_Events + replay)
 * ============================================================
 *
 *  Subscribes to the `article:stage_*` events for ONE article and
 *  dispatches them into `wizardSlice`. Also handles connect /
 *  disconnect status and replay-on-reconnect:
 *
 *    1. On `connect`, call `getStageChunksApi(articleId, stage, since)`
 *       for whichever stage is currently `running` and dispatch the
 *       returned chunks in order (the slice de-duplicates via
 *       `chunkIndex`).
 *    2. On `disconnect`, mark the stream as polling-fallback so the
 *       polling hook can take over (see `useArticlePolling`).
 *
 *  Requires `articleId` to be a stable string. Pass `null` to disable.
 */
export const useWizardStream = (articleId, runningStageRef) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!articleId) return undefined;
    const socket = getSocket();
    const matchesArticle = (p) => String(p?.articleId) === String(articleId);

    const handleStarted = (p) => {
      if (matchesArticle(p)) dispatch(wizardActions.stageStarted(p));
    };
    const handleChunk = (p) => {
      if (matchesArticle(p)) dispatch(wizardActions.stageChunk(p));
    };
    const handleCompleted = (p) => {
      if (matchesArticle(p)) dispatch(wizardActions.stageCompleted(p));
    };
    const handleFailed = (p) => {
      if (matchesArticle(p)) dispatch(wizardActions.stageFailed(p));
    };

    const replayMissedChunks = async () => {
      const stage = runningStageRef?.current;
      if (!stage) return;
      try {
        const res = await getStageChunksApi(articleId, stage, -1);
        const chunks = res?.data?.chunks || [];
        for (const chunk of chunks) {
          dispatch(wizardActions.stageChunk(chunk));
        }
      } catch {
        // Best-effort — polling hook will catch us up otherwise.
      }
    };

    const handleConnect = () => {
      dispatch(wizardActions.streamConnected());
      replayMissedChunks();
    };
    const handleDisconnect = () => {
      dispatch(wizardActions.streamDisconnected());
    };

    socket.on("article:stage_started", handleStarted);
    socket.on("article:stage_chunk", handleChunk);
    socket.on("article:stage_completed", handleCompleted);
    socket.on("article:stage_failed", handleFailed);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      dispatch(wizardActions.streamConnected());
    }

    return () => {
      socket.off("article:stage_started", handleStarted);
      socket.off("article:stage_chunk", handleChunk);
      socket.off("article:stage_completed", handleCompleted);
      socket.off("article:stage_failed", handleFailed);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [articleId, dispatch, runningStageRef]);
};
