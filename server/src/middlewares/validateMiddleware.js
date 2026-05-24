export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    const issues = err?.issues || err?.errors || [];
    const errors = issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return res.error({
      message: errors?.[0]?.message || err?.message || "Validation failed",
      statusCode: 422,
      data: null,
      trace:
        process.env.NODE_ENV !== "production"
          ? { validationErrors: errors }
          : null,
    });
  }
};
