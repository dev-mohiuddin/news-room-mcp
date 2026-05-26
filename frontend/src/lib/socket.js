import { io as ioClient } from "socket.io-client";

/**
 * ============================================================
 *  Socket.io client singleton
 * ============================================================
 *
 *  - Connects to VITE_API_URL with handshake auth `{ token }`
 *  - Auto-joins the user's workspace room on the backend
 *  - One global socket per page; the SocketProvider keeps it alive
 */

let socketSingleton = null;

const getToken = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

export const getSocket = () => {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;
  if (socketSingleton) return socketSingleton;

  const url = import.meta.env.VITE_API_URL || "http://localhost:8000";
  socketSingleton = ioClient(url, {
    transports: ["websocket"],
    withCredentials: true,
    auth: { token: getToken() },
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
 * Refresh the auth token used by the socket. Call after login/refresh.
 * Forces a reconnect so the new token is sent on the handshake.
 */
export const reauthSocket = () => {
  disconnectSocket();
  return getSocket();
};
