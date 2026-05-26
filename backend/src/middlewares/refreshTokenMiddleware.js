import { verifyRefreshToken } from "#utils/jwtUtil.js";

/**
 * Verifies refresh token from cookie or body and attaches `req.user.id`
 * so the controller can issue new tokens.
 */
export const verifyRefreshTokenMiddleware = (req, res, next) => {
  try {
    const token =
      req.cookies?.refresh_token ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];

    if (!token) {
      return res.error({
        message: "Refresh token missing",
        statusCode: 401,
      });
    }

    const decoded = verifyRefreshToken(token);
    req.user = { id: decoded.id || decoded.sub };
    req.refreshToken = token; // raw token surfaced for service rotation
    next();
  } catch (err) {
    return res.error({
      message: "Invalid refresh token",
      statusCode: 401,
      trace: err,
    });
  }
};
