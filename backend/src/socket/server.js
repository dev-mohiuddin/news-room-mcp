import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { getCorsOrigin } from "#config/corsConfig.js";
import { createSharedRedis, isRedisAvailable } from "#config/redisConfig.js";
import { logger } from "#utils/logger.js";
import { verifyAccessToken } from "#utils/jwtUtil.js";

export const app = express();
export const server = http.createServer(app);

const corsOrigin = getCorsOrigin();

export const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

/* ──────────────────────────────────────────────────────────
 *  Redis adapter — Requirement 13.x cross-process pub/sub
 *
 *  Without this, emits from the BullMQ worker process never
 *  reach API-connected browsers. The adapter is loaded async +
 *  best-effort: if `@socket.io/redis-adapter` is missing or
 *  Redis is unreachable, we log and keep the default in-memory
 *  adapter so single-process dev still works.
 *
 *  This module is imported by BOTH the API (app.js) and the
 *  worker (worker.js → socket events). Both attach the same
 *  adapter so emits travel via Redis pub/sub.
 * ────────────────────────────────────────────────────────── */
let adapterReady = false;

const attachRedisAdapter = async () => {
  /* Skip entirely when Redis is disabled — keeps single-process dev clean. */
  if (!isRedisAvailable()) {
    logger.info(
      "[socket] Redis disabled — using in-memory adapter (single-process mode)"
    );
    return;
  }

  try {
    const mod = await import("@socket.io/redis-adapter").catch((err) => {
      logger.warn(
        "[socket] @socket.io/redis-adapter not installed — falling back to in-memory adapter (single-process only)",
        { hint: "npm i @socket.io/redis-adapter", message: err.message }
      );
      return null;
    });
    if (!mod) return;

    const pubClient = createSharedRedis();
    const subClient = pubClient ? pubClient.duplicate() : null;
    if (!pubClient || !subClient) {
      logger.info(
        "[socket] Redis client unavailable — using in-memory adapter"
      );
      return;
    }

    pubClient.on("error", (err) =>
      logger.error("[socket] redis pub error", { message: err.message })
    );
    subClient.on("error", (err) =>
      logger.error("[socket] redis sub error", { message: err.message })
    );

    io.adapter(mod.createAdapter(pubClient, subClient));
    adapterReady = true;
    logger.info("[socket] Redis adapter attached — cross-process emits enabled");
  } catch (err) {
    logger.error(
      "[socket] failed to attach Redis adapter — falling back to in-memory",
      { message: err.message }
    );
  }
};

// Defer adapter wiring to next tick so dotenv.config() in app.js / worker.js
// has run and `process.env.REDIS_DISABLED` is observable.
setImmediate(() => {
  attachRedisAdapter().catch((err) => {
    logger.error("[socket] adapter init crashed", { message: err.message });
  });
});

export const isSocketAdapterClustered = () => adapterReady;

/* ──────────────────────────────────────────────────────────
 *  Cookie parsing helper for handshake
 * ────────────────────────────────────────────────────────── */
const parseCookies = (cookieHeader = "") => {
  const out = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
};

/* ──────────────────────────────────────────────────────────
 *  Socket.io handshake auth — Requirement 13.8.
 *  Accepts JWT from:
 *    1. socket.handshake.auth.token (preferred)
 *    2. socket.handshake.auth.accessToken (alias)
 *    3. cookie `access_token`
 *
 *  On verification:
 *    - attaches { userId, workspaceId, role, permissions } to socket.data
 *    - auto-joins room `workspace:{workspaceId}` if a workspaceId exists
 *    - auto-joins room `user:{userId}` for direct emits (replaces the
 *      in-memory userSocketMap, which was per-process and broke
 *      cross-process direct emits via emitToUser)
 *
 *  Reject with `next(new Error("..."))` to disconnect.
 * ────────────────────────────────────────────────────────── */
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

  if (userId) socket.join(`user:${userId}`);
  if (workspaceId) socket.join(`workspace:${workspaceId}`);

  socket.on("disconnect", (reason) => {
    logger.info("Socket disconnected", {
      socketId: socket.id,
      userId,
      reason,
    });
  });

  socket.on("error", (err) => {
    logger.error("Socket error", { socketId: socket.id, error: err.message });
  });
});

io.engine.on("connection_error", (err) => {
  logger.error("Socket engine connection error", { error: err.message });
});

/* ──────────────────────────────────────────────────────────
 *  Public emit helpers
 *
 *  These are SAFE to call from any process (API or worker) as
 *  long as the Redis adapter is attached. With the adapter,
 *  `io.to(room).emit(...)` publishes to Redis and every
 *  Socket.io node delivers to its connected clients in that
 *  room. Without the adapter, emits stay local — fine for
 *  single-process dev.
 * ────────────────────────────────────────────────────────── */
export const emitToUser = (userId, event, payload) => {
  if (!userId) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
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
