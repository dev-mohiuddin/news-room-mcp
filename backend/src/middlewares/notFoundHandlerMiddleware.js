export const notFoundHandler = (req, res) => {
  res.error({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    data: null,
  });
};
