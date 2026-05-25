import { v4 as uuidv4 } from "uuid";
import path from "path";
import { buildPaginationMeta, DEFAULT_PER_PAGE } from "#utils/paginationUtil.js";

/**
 * ============================================================
 *  Response Utility — Newsroom MCP
 * ============================================================
 *
 * Attaches `res.success()`, `res.paginated()`, and `res.error()`
 * with a uniform JSON shape so the frontend can rely on it.
 *
 *   Success (object):
 *   {
 *     success: true,
 *     statusCode: 200,
 *     message: "...",
 *     data: { ... },
 *     request: { method, url, ip?, requestId }
 *   }
 *
 *   Success (array — pagination AUTO-attached):
 *   {
 *     success: true,
 *     statusCode: 200,
 *     message: "...",
 *     data: [ ... ],
 *     pagination: { page, perPage, total, totalPages, hasNext, hasPrev,
 *                   search, sortBy, sortOrder, filters },
 *     request: { ... }
 *   }
 *
 *   Error:
 *   {
 *     success: false,
 *     statusCode: 400,
 *     message: "...",
 *     data: null,
 *     trace?: { ... },
 *     request: { ... }
 *   }
 */

export const attachRequestId = (req, res, next) => {
  if (!req.requestId) req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
};

const buildRequestMeta = (req) => ({
  method: req.method,
  url: req.originalUrl,
  ...(process.env.NODE_ENV !== "production" ? { ip: req.ip } : {}),
  requestId: req.requestId || null,
});

/**
 * Smart success responder.
 * - If `data` is an array, pagination is automatically included
 *   (uses what was passed in `pagination`, otherwise infers from array length).
 * - If `data` is a non-array (object / null / primitive), pagination is omitted
 *   even if it was passed.
 *
 * Service layer can return either:
 *   { items: [...], meta: {...} } — preferred for paginated lists
 *   plain array, plain object, etc.
 */
export const globalResponse = (req, res, next) => {
  res.success = (payload = {}) => {
    let {
      data = null,
      message = "Success",
      statusCode = 200,
      pagination = null,
      meta = null, // alias for pagination
    } = payload;

    // Convention: services may return { items, meta } from paginate helpers
    if (
      data &&
      typeof data === "object" &&
      Array.isArray(data.items) &&
      data.meta &&
      typeof data.meta === "object"
    ) {
      pagination = pagination || data.meta;
      data = data.items;
    }

    const isArray = Array.isArray(data);

    // Auto-attach pagination for arrays if not provided
    if (isArray && !pagination && !meta) {
      pagination = buildPaginationMeta({
        page: 1,
        perPage: DEFAULT_PER_PAGE,
        total: data.length,
      });
    }

    // For non-arrays, strip pagination even if accidentally passed
    if (!isArray) {
      pagination = null;
      meta = null;
    }

    const response = {
      success: true,
      statusCode,
      message,
      data,
      ...(pagination ? { pagination } : {}),
      ...(meta && !pagination ? { meta } : {}),
      request: buildRequestMeta(req),
    };

    res.status(statusCode).json(response);
  };

  /**
   * Explicit paginated response — preferred when you already have items+meta.
   *   res.paginated({ items, meta, message? })
   */
  res.paginated = ({ items = [], meta = null, message = "Fetched successfully", statusCode = 200 } = {}) => {
    const pagination =
      meta ||
      buildPaginationMeta({
        page: 1,
        perPage: DEFAULT_PER_PAGE,
        total: items.length,
      });

    res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data: items,
      pagination,
      request: buildRequestMeta(req),
    });
  };

  /**
   * Error responder — used by middlewares and direct rejections.
   * Most application errors should `throwError(...)` and be caught by
   * globalErrorHandler instead of calling res.error directly.
   */
  res.error = ({
    message = "Something went wrong",
    statusCode = 400,
    data = null,
    trace = null,
  } = {}) => {
    let errorTrace = null;

    if (trace instanceof Error) {
      if (process.env.NODE_ENV !== "production" && trace.stack) {
        const stackLines = trace.stack.split("\n").slice(1);
        errorTrace = stackLines.map((line) => {
          const match = line.match(/\((.*):(\d+):(\d+)\)/);
          if (match) {
            const [, filePath, lineNum, colNum] = match;
            return {
              file: path.relative(process.cwd(), filePath),
              line: parseInt(lineNum, 10),
              column: parseInt(colNum, 10),
              description: `${trace.name}: ${trace.message}`,
            };
          }
          return { raw: line.trim(), description: `${trace.name}: ${trace.message}` };
        });
      } else {
        errorTrace = { name: trace.name, message: trace.message };
      }
    } else if (trace && typeof trace === "object") {
      errorTrace = trace;
    } else if (typeof trace === "string") {
      errorTrace = { message: trace };
    }

    const response = {
      success: false,
      statusCode,
      message,
      data,
      ...(errorTrace ? { trace: errorTrace } : {}),
      request: buildRequestMeta(req),
    };

    res.status(statusCode).json(response);
  };

  next();
};
