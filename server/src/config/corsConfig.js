const FALLBACK_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_APP_ORIGIN || process.env.ALLOWED_ORIGINS || "";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const getAllowedOrigins = () => parseAllowedOrigins();

export const getCorsOrigin = () => {
  const allowedOrigins = parseAllowedOrigins();

  if (!allowedOrigins.length) {
    allowedOrigins.push(...FALLBACK_ORIGINS);
  }

  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"), false);
  };
};
