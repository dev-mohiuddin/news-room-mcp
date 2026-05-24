import { useState, useMemo } from "react";

export function usePagination(data = [], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const lastPage = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  const paginationInfo = {
    current_page: currentPage,
    last_page: lastPage,
    prev_page_url: currentPage > 1 ? true : null,
    next_page_url: currentPage < lastPage ? true : null,
  };

  const onPageChange = (page) => {
    if (page < 1 || page > lastPage) return;
    setCurrentPage(page);
  };

  return { paginatedData, paginationInfo, onPageChange, setCurrentPage };
}
