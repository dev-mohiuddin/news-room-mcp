import jwt from "jsonwebtoken";

const getSecret = (type) => {
  const secret = type === "refresh"
    ? process.env.JWT_REFRESH_SECRET
    : process.env.JWT_SECRET;

  if (!secret || secret.startsWith("change-this") || secret.includes("sharebit-secret")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`JWT ${type} secret is not configured. Set JWT_${type === "refresh" ? "REFRESH_" : ""}SECRET in production.`);
    }
    if (process.env.NODE_ENV !== "development") {
      throw new Error(`JWT ${type} secret is not configured. Set a secure secret for non-development environments.`);
    }
  }

  return secret || (type === "refresh" ? "dev-refresh-secret-only" : "dev-access-secret-only");
};

export const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, getSecret("access"), {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "sharebit-server",
    ...options,
  });
};

export const signRefreshToken = (payload, options = {}) => {
  return jwt.sign(payload, getSecret("refresh"), {
    algorithm: "HS256",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    issuer: "sharebit-server",
    ...options,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, getSecret("access"), {
    algorithms: ["HS256"],
    issuer: "sharebit-server",
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, getSecret("refresh"), {
    algorithms: ["HS256"],
    issuer: "sharebit-server",
  });
};

export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
