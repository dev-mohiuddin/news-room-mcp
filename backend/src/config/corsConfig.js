const FALLBACK_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

const parseAllowedOrigins = () => {
  const raw =
    process.env.CLIENT_APP_ORIGIN || process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
};

export const getAllowedOrigins = () => parseAllowedOrigins();

export const getCorsOrigin = () => {
  const allowedOrigins = parseAllowedOrigins();
  if (!allowedOrigins.length) {
    allowedOrigins.push(...FALLBACK_ORIGINS);
  }

  return (origin, callback) => {
    // Allow no-origin requests (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS: origin '${origin}' not allowed`), false);
  };
};
