// Wraps async route handlers to forward errors to globalErrorHandler
// without try/catch boilerplate in every controller.
export const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};
