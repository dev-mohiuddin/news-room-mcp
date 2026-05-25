import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import xss from "xss";
import { getCorsOrigin } from "#config/corsConfig.js";

const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== "object") return;
  Object.keys(obj).forEach((key) => {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      return;
    }
    const value = obj[key];
    if (typeof value === "object" && value !== null) sanitizeNoSql(value);
  });
};

const xssSanitize = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      xssSanitize(obj[key]);
    }
  }
};

const xssMiddleware = (req, _res, next) => {
  if (req.body) xssSanitize(req.body);
  if (req.params) xssSanitize(req.params);
  if (req.query) xssSanitize(req.query);
  next();
};

const noSqlInjectionMiddleware = (req, _res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.params) sanitizeNoSql(req.params);
  if (req.query) sanitizeNoSql(req.query);
  next();
};

const corsOrigin = getCorsOrigin();

export const securityMiddleware = [
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", process.env.CLIENT_APP_ORIGIN || "http://localhost:5173"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  }),
  cors({ origin: corsOrigin, credentials: true }),
  hpp(),
  noSqlInjectionMiddleware,
  xssMiddleware,
  (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    next();
  },
];
