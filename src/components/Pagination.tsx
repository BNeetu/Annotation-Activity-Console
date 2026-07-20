import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, disabled }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          Page <span className="font-medium text-slate-600">{page}</span> of {totalPages} &middot; {total} tasks
        </span>

        {/* Page size lives right next to the count it directly affects,
            rather than on a separate Settings screen -- changing it always
            resets to page 1, since "page 3 of 20-per-page" doesn't mean
            anything once the page size changes. */}
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hidden sm:inline">Rows per page</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            className="rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-xs text-slate-600 shadow-soft transition-colors hover:border-slate-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="flex items-center gap-1 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
