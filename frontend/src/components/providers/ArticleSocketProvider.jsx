import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket, disconnectSocket } from "@/lib/socket";
import {
  receiveProgress,
  receiveDone,
  receiveFailed,
} from "@/redux/slice/article-slice";

/**
 * Mounts the socket connection once per authenticated session and
 * dispatches `article:*` events into the article slice.
 *
 * Place this component near the root of the user panel (UserLayout).
 */
export default function ArticleSocketProvider({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const userId = useSelector((s) => s.auth.user?.id);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return undefined;
    }
    const socket = getSocket();

    const onProgress = (payload) => dispatch(receiveProgress(payload));
    const onDone = (payload) => dispatch(receiveDone(payload));
    const onFailed = (payload) => dispatch(receiveFailed(payload));

    socket.on("article:progress", onProgress);
    socket.on("article:done", onDone);
    socket.on("article:failed", onFailed);

    return () => {
      socket.off("article:progress", onProgress);
      socket.off("article:done", onDone);
      socket.off("article:failed", onFailed);
    };
  }, [dispatch, isAuthenticated, userId]);

  return children ?? null;
}
