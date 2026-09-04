"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemName?: string;
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemName = "records",
  compact = false,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 select-none">
      {/* Summary info */}
      <div className="flex items-center gap-2">
        <span>
          Showing{" "}
          <strong className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
            {startItem.toLocaleString()}
          </strong>{" "}
          to{" "}
          <strong className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
            {endItem.toLocaleString()}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
            {totalItems.toLocaleString()}
          </strong>{" "}
          {itemName}
        </span>

        {/* Rows per page selector */}
        {!compact && onPageSizeChange && pageSizeOptions.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
        {/* First page */}
        {!compact && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Previous page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium pr-0.5">
            Prev
          </span>
        </button>

        {/* Page numbers (only in non-compact mode) */}
        {!compact && (
          <div className="flex items-center gap-1 px-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 text-slate-400 text-xs"
                  >
                    ...
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
                    isActive
                      ? "bg-teal-600 text-white shadow-xs font-bold"
                      : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Compact page indicator */}
        {compact && (
          <span className="px-2 text-xs font-mono font-medium">
            {currentPage} / {totalPages}
          </span>
        )}

        {/* Next page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Next Page"
        >
          <span className="hidden md:inline text-[11px] font-medium pl-0.5">
            Next
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        {!compact && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
