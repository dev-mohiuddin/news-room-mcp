import { io as ioClient } from "socket.io-client";

/**
 * ============================================================
 *  Socket.io client singleton
 * ============================================================
 *
 *  - Connects to VITE_API_URL with `withCredentials: true`. The
 *    httpOnly `access_token` cookie is sent automatically; the
 *    backend handshake (backend/src/socket/server.js) reads it
 *    from the cookie header. We do NOT pass a JS-readable token
 *    because the frontend never holds one — the cookie is the
 *    single source of truth.
 *  - Auto-joins `workspace:{workspaceId}` and `user:{userId}` on
 *    the backend after the handshake validates the JWT.
 *  - One global socket per page; the SocketProvider keeps it alive.
 */

let socketSingleton = null;

export const getSocket = () => {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;
  if (socketSingleton) return socketSingleton;

  const url = import.meta.env.VITE_API_URL || "http://localhost:8000";
  socketSingleton = ioClient(url, {
    transports: ["websocket"],
    withCredentials: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socketSingleton;
};

export const disconnectSocket = () => {
  if (socketSingleton) {
    socketSingleton.disconnect();
    socketSingleton = null;
  }
};

/**
 * Force a reconnect — call after login/refresh so the new auth
 * cookie is presented on the handshake. (The cookie itself was
 * set by the API on the same domain, so the browser already has
 * it; we just need a fresh handshake to read it.)
 */
export const reauthSocket = () => {
  disconnectSocket();
  return getSocket();
};
