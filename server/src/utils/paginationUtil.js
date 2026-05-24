export const buildPagination = ({ page = 1, limit = 20, total = 0 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const perPage = Math.max(Number(limit) || 20, 1);
  const totalPages = Math.ceil(total / perPage) || 1;
  return {
    page: currentPage,
    limit: perPage,
    total,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};
