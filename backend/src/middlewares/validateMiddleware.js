/**
 * Zod validator middleware.
 *
 * Pass a schema that expects the shape:
 *   z.object({ body: ..., query: ..., params: ... })
 *
 * Any of the three keys may be omitted — only what's defined is validated.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace request shapes with parsed (sanitized + coerced) values.
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (err) {
    const issues = err?.issues || err?.errors || [];
    const errors = issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return res.error({
      message: errors[0]?.message || err?.message || "Validation failed",
      statusCode: 422,
      data: null,
      trace:
        process.env.NODE_ENV !== "production"
          ? { validationErrors: errors }
          : null,
    });
  }
};
