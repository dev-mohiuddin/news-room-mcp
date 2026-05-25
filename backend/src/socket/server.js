import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { getCorsOrigin } from "#config/corsConfig.js";
import { logger } from "#utils/logger.js";

export const app = express();
export const server = http.createServer(app);

const corsOrigin = getCorsOrigin();

export const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

// userId -> socketId map (in-memory; swap to Redis for multi-instance)
const userSocketMap = new Map();

io.on("connection", (socket) => {
  logger.info("Socket connected", { socketId: socket.id });

  socket.on("register", (userId) => {
    try {
      if (!userId) return;
      userSocketMap.set(String(userId), socket.id);
      logger.info("Socket user registered", { userId, socketId: socket.id });
    } catch (err) {
      logger.error("Socket register error", { error: err.message });
    }
  });

  socket.on("disconnect", (reason) => {
    logger.info("Socket disconnected", { socketId: socket.id, reason });
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
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
    logger.error("Socket emit error", {
      userId,
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
