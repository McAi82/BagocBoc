// components/ui/Pagination.tsx

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (n: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  showItemsPerPage = true,
}: PaginationProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="px-4 py-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Left: Info + Items per page */}
      <div className="flex items-center gap-3 order-2 sm:order-1 flex-wrap">
        <p className="text-sm text-theme-textSecondary">
          Showing{" "}
          <span className="font-semibold text-theme-text">
            {totalItems > 0 ? startIndex + 1 : 0}–{endIndex}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-theme-text">{totalItems}</span>
        </p>

        {showItemsPerPage && onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-theme rounded-lg bg-theme-surface text-theme-text text-xs focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {itemsPerPageOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right: Page controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-theme-textSecondary text-sm"
                >
                  …
                </span>
              );
            }
            const pageNum = page as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-theme-primary text-white shadow-sm"
                    : "border border-theme text-theme-text hover:bg-theme-hover"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}