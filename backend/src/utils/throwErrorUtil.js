/**
 * Throws a structured error that the globalErrorHandler can format consistently.
 *
 * Usage:
 *   throwError("User not found", 404);
 *   throwError("Validation failed", 422, { fields: ["email"] });
 */
export const throwError = (message = "Internal Server Error", statusCode = 500, data = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  if (data) err.data = data;
  throw err;
};

/**
 * Custom AppError class — same behavior as throwError but instantiable.
 * Useful when you want to wrap an existing error or pass through middleware.
 */
export class AppError extends Error {
  constructor(message = "Internal Server Error", statusCode = 500, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (data) this.data = data;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
