/**
 * Zod validator middleware.
 *
 * Pass a schema that expects the shape:
 *   z.object({ body: ..., query: ..., params: ... })
 *
 * Any of the three keys may be omitted — only what's defined is validated.
 *
 * Express 5 note: `req.query` and `req.params` are getter-only, so we
 * cannot reassign them with `=`. We mutate `req.body` directly (still
 * writeable in Express 5) and stash the parsed query/params on
 * `req.validated` so handlers can read coerced values when needed.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace `body` (writeable). Stash query/params on req.validated.
    if (parsed.body !== undefined) req.body = parsed.body;
    req.validated = {
      query: parsed.query,
      params: parsed.params,
      body: parsed.body,
    };

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
