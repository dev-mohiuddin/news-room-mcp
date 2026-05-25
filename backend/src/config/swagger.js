import swaggerUi from "swagger-ui-express";

/**
 * Swagger spec — extend `paths` and `components.schemas` per feature module.
 * Hosted at /api/docs.
 */
const buildSwaggerSpec = () => {
  const baseUrl =
    process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;

  return {
    openapi: "3.0.0",
    info: {
      title: "Newsroom MCP API",
      version: "1.0.0",
      description:
        "AI-powered content publishing platform — research, write, SEO, publish.",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
        },
      },
      schemas: {
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            perPage: { type: "integer", example: 10 },
            total: { type: "integer", example: 142 },
            totalPages: { type: "integer", example: 15 },
            hasNext: { type: "boolean" },
            hasPrev: { type: "boolean" },
            search: { type: "string" },
            sortBy: { type: "string" },
            sortOrder: { type: "string", enum: ["asc", "desc"] },
            filters: { type: "object" },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: { 200: { description: "Health status" } },
        },
      },
    },
  };
};

export const setupSwagger = (app) => {
  const spec = buildSwaggerSpec();
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec));
};
