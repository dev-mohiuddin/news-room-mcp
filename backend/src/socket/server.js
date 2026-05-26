import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { getCorsOrigin } from "#config/corsConfig.js";
import { logger } from "#utils/logger.js";
import { verifyAccessToken } from "#utils/jwtUtil.js";

export const app = express();
export const server = http.createServer(app);

const corsOrigin = getCorsOrigin();

export const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

// userId -> socketId map (in-memory; swap to Redis adapter for multi-instance)
const userSocketMap = new Map();

const parseCookies = (cookieHeader = "") => {
  const out = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
};

/**
 * Socket.io handshake auth — Requirement 13.8.
 * Accepts JWT from:
 *   1. socket.handshake.auth.token (preferred)
 *   2. socket.handshake.auth.accessToken (alias)
 *   3. cookie `access_token`
 *
 * On verification:
 *   - attaches { userId, workspaceId, role, roleScope } to socket.data
 *   - auto-joins room `workspace:{workspaceId}` if a workspaceId exists
 *
 * Reject with `next(new Error("..."))` to disconnect.
 */
io.use((socket, next) => {
  try {
    const authPayload = socket.handshake.auth || {};
    let token = authPayload.token || authPayload.accessToken;
    if (!token) {
      const cookies = parseCookies(socket.handshake.headers?.cookie || "");
      token = cookies.access_token;
    }
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const decoded = verifyAccessToken(token);
    socket.data.user = {
      userId: decoded.id || decoded.sub,
      role: decoded.role || null,
      permissions: decoded.permissions || [],
      workspaceId: decoded.workspaceId || null,
    };
    next();
  } catch (err) {
    logger.warn("Socket auth failed", { message: err.message });
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const { userId, workspaceId } = socket.data.user || {};
  logger.info("Socket connected", { socketId: socket.id, userId, workspaceId });

  if (userId) userSocketMap.set(String(userId), socket.id);
  if (workspaceId) socket.join(`workspace:${workspaceId}`);

  socket.on("disconnect", (reason) => {
    logger.info("Socket disconnected", {
      socketId: socket.id,
      userId,
      reason,
    });
    if (userId) userSocketMap.delete(String(userId));
  });

  socket.on("error", (err) => {
    logger.error("Socket error", { socketId: socket.id, error: err.message });
  });
});

io.engine.on("connection_error", (err) => {
  logger.error("Socket engine connection error", { error: err.message });
});

/* ── Helpers ── */

export const emitToUser = (userId, event, payload) => {
  if (!userId) return;
  try {
    const socketId = userSocketMap.get(String(userId));
    if (socketId) io.to(socketId).emit(event, payload);
  } catch (err) {
    logger.error("Socket emit error", { userId, event, error: err.message });
  }
};

export const emitToWorkspace = (workspaceId, event, payload) => {
  if (!workspaceId) return;
  try {
    io.to(`workspace:${workspaceId}`).emit(event, payload);
  } catch (err) {
    logger.error("Socket workspace emit error", {
      workspaceId,
      event,
      error: err.message,
    });
  }
};

export const broadcastToAll = (event, payload) => {
  try {
    io.emit(event, payload);
  } catch (err) {
    logger.error("Socket broadcast error", { event, error: err.message });
  }
};
