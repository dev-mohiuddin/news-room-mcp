import { ZodError } from "zod";
import path from "path";
import { logger } from "#utils/logger.js";

const USER_FRIENDLY_MESSAGES = {
  "Invalid email or password": "Invalid email or password. Please check your credentials and try again.",
  "Account not verified. Please verify OTP.": "Your account is not verified yet. Please check your email for the verification code.",
  "Account already verified": "Your account is already verified. You can log in normally.",
  "User not found": "Account not found. Please check your email or register a new account.",
  "Email already exists": "This email is already registered. Try logging in instead.",
  "Invalid OTP": "The verification code is incorrect. Please check and try again.",
  "OTP expired. Please resend OTP.": "Your verification code has expired. Please request a new one.",
  "OTP not found. Please resend OTP.": "No verification code found. Please resend the OTP.",
  "Refresh token missing": "Your session has expired. Please log in again.",
  "Invalid refresh token": "Your session is invalid. Please log in again.",
  "Invalid or expired reset token": "This password reset link has expired. Please request a new one.",
  "Not logged in": "Please log in to access this feature.",
  "Forbidden": "You do not have permission to perform this action.",
  "Too many requests. Please try again later.": "Too many attempts. Please wait a moment and try again.",
  "No available shares left for this asset": "This asset is fully subscribed. No shares are currently available.",
  "Insufficient balance": "Insufficient wallet balance. Please add funds to your wallet first.",
  "Asset is not available for purchase": "This asset is not currently available for purchase.",
  "No shares available for this asset": "All shares for this asset have been assigned.",
  "Upload at least one identity document before submission": "Please upload at least one identity document (NID, Passport, or Driving License) before submitting.",
  "Add at least one payout method (bank or bKash) before submission": "Please add at least one payout method (Bank or bKash) before submitting.",
  "Your profile is not approved yet. Financial actions are blocked until approval": "Your profile is pending approval. Financial features will be available once approved by admin.",
  "Account is inactive. Financial actions are blocked": "Your account is currently inactive. Please contact support for assistance.",
};

const getUserFriendlyMessage = (originalMessage) => {
  if (!originalMessage) return "Something went wrong. Please try again.";
  for (const [key, value] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (originalMessage.includes(key)) return value;
  }
  return originalMessage;
};

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let data = err.data || null;
  let isClientError = statusCode >= 400 && statusCode < 500;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    data = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    isClientError = true;
  } else if (err.code && err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for '${field}': '${err.keyValue[field]}' already exists.`;
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
  }

  const userMessage = isClientError ? getUserFriendlyMessage(message) : message;

  let trace;
  if (process.env.NODE_ENV === "development" && err.stack) {
    const stackLines = err.stack.split("\n").slice(1);
    trace = stackLines.map((line) => {
      const match = line.match(/\((.*):(\d+):(\d+)\)/);
      if (match) {
        const [_, filePath, lineNum, colNum] = match;
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
    message: userMessage,
    statusCode,
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
