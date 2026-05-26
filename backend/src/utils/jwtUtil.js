import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const ISSUER = "newsroom-mcp";

/**
 * Generate a fresh JTI (JWT ID) — used to track refresh-token chains
 * for rotation + reuse-detection (Requirement 16).
 */
export const generateJti = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  crypto.randomBytes(16).toString("hex");

const getSecret = (type) => {
  const secret =
    type === "refresh" ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;

  const isPlaceholder =
    !secret ||
    secret.startsWith("change-this") ||
    secret.includes("placeholder");

  if (isPlaceholder && process.env.NODE_ENV === "production") {
    throw new Error(
      `JWT ${type} secret is not configured. Set JWT_${
        type === "refresh" ? "REFRESH_" : ""
      }SECRET in production.`
    );
  }

  return secret || (type === "refresh" ? "dev-refresh-secret-only" : "dev-access-secret-only");
};

export const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, getSecret("access"), {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: ISSUER,
    ...options,
  });
};

export const signRefreshToken = (payload, options = {}) => {
  const jti = options.jwtid || generateJti();
  const token = jwt.sign(payload, getSecret("refresh"), {
    algorithm: "HS256",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    issuer: ISSUER,
    jwtid: jti,
    ...options,
  });
  return { token, jti };
};

export const verifyAccessToken = (token) =>
  jwt.verify(token, getSecret("access"), { algorithms: ["HS256"], issuer: ISSUER });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, getSecret("refresh"), { algorithms: ["HS256"], issuer: ISSUER });

// Aliases — for backward compatibility with patterns from the old server folder.
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
