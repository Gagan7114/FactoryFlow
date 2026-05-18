import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 text-sm">
      <div className="text-muted-foreground">
        Showing {start}-{end} of {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground" htmlFor="page-size">
          Rows
        </label>
        <select
          id="page-size"
          className="h-9 rounded-md border px-2 text-sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          disabled={isLoading}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[88px] text-center text-muted-foreground">
          Page {page} of {safeTotalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || page >= safeTotalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
