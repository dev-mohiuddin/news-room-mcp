/**
 * ============================================================
 *  Pagination Utilities — Newsroom MCP
 * ============================================================
 *
 * Frontend always receives the SAME pagination shape:
 *   {
 *     page: 1,
 *     perPage: 10,
 *     total: 142,
 *     totalPages: 15,
 *     hasNext: true,
 *     hasPrev: false,
 *     search: "",
 *     filters: {},
 *     sortBy: "createdAt",
 *     sortOrder: "desc"
 *   }
 *
 * Default per-page = 10 (configurable, capped at 100).
 */

export const DEFAULT_PER_PAGE = 10;
export const MAX_PER_PAGE = 100;

/**
 * Parse pagination + search + filter + sort params from req.query.
 * Strips reserved keys so anything left is a custom filter.
 *
 * Reserved keys: page, perPage, limit, search, sortBy, sortOrder
 */
export const parsePaginationParams = (req, options = {}) => {
  const {
    defaultPerPage = DEFAULT_PER_PAGE,
    maxPerPage = MAX_PER_PAGE,
    defaultSortBy = "createdAt",
    defaultSortOrder = "desc",
    allowedSortFields = null, // optional whitelist
    allowedFilters = null, // optional whitelist of filter keys
  } = options;

  const query = req.query || {};

  // Page
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  // Per-page (accepts both `perPage` and `limit` for compatibility)
  const requestedPerPage = parseInt(query.perPage ?? query.limit, 10) || defaultPerPage;
  const perPage = Math.min(Math.max(requestedPerPage, 1), maxPerPage);

  // Search
  const search = typeof query.search === "string" ? query.search.trim() : "";

  // Sort
  let sortBy = typeof query.sortBy === "string" ? query.sortBy.trim() : defaultSortBy;
  if (allowedSortFields && !allowedSortFields.includes(sortBy)) {
    sortBy = defaultSortBy;
  }
  const sortOrder = String(query.sortOrder || defaultSortOrder).toLowerCase() === "asc" ? "asc" : "desc";

  // Custom filters — any non-reserved key
  const reserved = new Set(["page", "perPage", "limit", "search", "sortBy", "sortOrder"]);
  const filters = {};
  for (const [key, value] of Object.entries(query)) {
    if (reserved.has(key)) continue;
    if (allowedFilters && !allowedFilters.includes(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    filters[key] = value;
  }

  const skip = (page - 1) * perPage;

  return { page, perPage, skip, search, sortBy, sortOrder, filters };
};

/**
 * Build the full pagination metadata block returned to the frontend.
 */
export const buildPaginationMeta = ({
  page = 1,
  perPage = DEFAULT_PER_PAGE,
  total = 0,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  filters = {},
} = {}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safePerPage = Math.max(Number(perPage) || DEFAULT_PER_PAGE, 1);
  const safeTotal = Math.max(Number(total) || 0, 0);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / safePerPage);

  return {
    page: safePage,
    perPage: safePerPage,
    total: safeTotal,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    search,
    sortBy,
    sortOrder,
    filters,
  };
};

/**
 * One-shot helper — runs `find().skip().limit()` + `countDocuments()`
 * in parallel against a Mongoose Model and returns `{ items, meta }`.
 *
 * Usage in service:
 *   const params = parsePaginationParams(req);
 *   const { items, meta } = await paginateModel(ArticleModel, { workspaceId }, params, {
 *     searchFields: ["title", "keyword"],
 *     populate: [{ path: "author", select: "name" }],
 *   });
 */
export const paginateModel = async (Model, baseQuery = {}, params = {}, options = {}) => {
  const {
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    skip = 0,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    filters = {},
  } = params;

  const {
    searchFields = [],
    populate = null,
    select = null,
    lean = false,
  } = options;

  // Compose final query: baseQuery + filters + search
  const query = { ...baseQuery, ...filters };

  if (search && searchFields.length > 0) {
    query.$or = searchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  const cursor = Model.find(query).sort(sort).skip(skip).limit(perPage);
  if (select) cursor.select(select);
  if (populate) cursor.populate(populate);
  if (lean) cursor.lean();

  const [items, total] = await Promise.all([cursor.exec(), Model.countDocuments(query)]);

  const meta = buildPaginationMeta({
    page,
    perPage,
    total,
    search,
    sortBy,
    sortOrder,
    filters,
  });

  return { items, meta };
};
