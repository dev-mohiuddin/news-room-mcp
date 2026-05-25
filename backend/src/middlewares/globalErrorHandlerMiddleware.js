import { ZodError } from "zod";
import path from "path";
import { logger } from "#utils/logger.js";

const USER_FRIENDLY_MESSAGES = {
  "Invalid email or password":
    "Invalid email or password. Please check your credentials and try again.",
  "User not found":
    "Account not found. Please check your email or register a new account.",
  "Email already exists":
    "This email is already registered. Try logging in instead.",
  "Invalid OTP": "The verification code is incorrect. Please check and try again.",
  "OTP expired": "Your verification code has expired. Please request a new one.",
  "Refresh token missing":
    "Your session has expired. Please log in again.",
  "Invalid refresh token": "Your session is invalid. Please log in again.",
  "Invalid or expired reset token":
    "This password reset link has expired. Please request a new one.",
  "Authentication required": "Please log in to access this feature.",
  "You don't have permission":
    "You don't have permission to perform this action.",
  "Too many requests":
    "Too many attempts. Please wait a moment and try again.",
};

const getUserFriendlyMessage = (originalMessage) => {
  if (!originalMessage) return "Something went wrong. Please try again.";
  for (const [key, value] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (originalMessage.includes(key)) return value;
  }
  return originalMessage;
};

// eslint-disable-next-line no-unused-vars
export const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let data = err.data || null;
  let isClientError = statusCode >= 400 && statusCode < 500;

  if (err instanceof ZodError) {
    statusCode = 422;
    message = "Validation failed";
    data = (err.issues || err.errors || []).map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    isClientError = true;
  } else if (err.code && err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value: '${field}' = '${err.keyValue?.[field]}' already exists.`;
    data = err.keyValue;
    isClientError = true;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    data = {};
    for (const key in err.errors) {
      data[key] = err.errors[key].message;
    }
    message = "Validation Error";
    isClientError = true;
  } else if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = "Invalid ID format. Please check the request.";
    isClientError = true;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token. Please log in again.";
    isClientError = true;
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
    isClientError = true;
  } else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "File too large. Please upload a smaller file.";
    isClientError = true;
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = err.message || "File upload error";
    isClientError = true;
  }

  const userMessage = isClientError ? getUserFriendlyMessage(message) : message;

  let trace;
  if (process.env.NODE_ENV === "development" && err.stack) {
    const stackLines = err.stack.split("\n").slice(1);
    trace = stackLines.map((line) => {
      const match = line.match(/\((.*):(\d+):(\d+)\)/);
      if (match) {
        const [, filePath, lineNum, colNum] = match;
        return {
          file: path.relative(process.cwd(), filePath),
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          description: `${err.name}: ${err.message}`,
        };
      }
      return { raw: line.trim(), description: `${err.name}: ${err.message}` };
    });
  }

  logger.error("%s %s -> %s", req.method, req.originalUrl, err.message, {
    statusCode,
    requestId: req.requestId || null,
    stack: err.stack,
  });

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message: userMessage,
    data,
    ...(trace ? { trace } : {}),
    request: {
      method: req.method,
      url: req.originalUrl,
      ...(process.env.NODE_ENV !== "production" ? { ip: req.ip } : {}),
      requestId: req.requestId || null,
    },
  });
};
