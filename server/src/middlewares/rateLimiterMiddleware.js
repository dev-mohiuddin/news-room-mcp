import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const createLimiter = (maxRequests = 100, windowMinutes = 15, skipCondition) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    skip: skipCondition || (() => false),
    handler: (req, res) => {
      const retryAfterSeconds = Math.ceil(
        (req.rateLimit.resetTime - Date.now()) / 1000
      );
      res.set("Retry-After", String(retryAfterSeconds));

      return res.error({
        statusCode: 429,
        message: "Too many requests. Please try again later.",
        data: null,
      });
    },
  });
};

export const globalRateLimiter = (maxRequests = 100, windowMinutes = 15) => {
  const isDev = process.env.NODE_ENV !== "production";
  return createLimiter(maxRequests, windowMinutes, isDev ? (req) => req.path === "/api/health" : undefined);
};

export const createRateLimiter = (maxRequests = 100, windowMinutes = 15, skipCondition) => {
  return createLimiter(maxRequests, windowMinutes, skipCondition);
};

export const createStrictRateLimiter = (maxRequests = 10, windowMinutes = 15) => {
  return createLimiter(maxRequests, windowMinutes);
};
