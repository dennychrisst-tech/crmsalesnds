import { useMemo, useState } from "react";

// Slices an already-filtered/sorted list into pages. `page` is clamped to
// the valid range on every render (not via an effect) — e.g. narrowing a
// search while on page 4 of a now-2-page list snaps back to page 2
// automatically instead of showing an empty page.
export function usePagination<T>(items: T[], pageSize = 25) {
  const [requestedPage, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const paged = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  return { page, setPage, totalPages, totalItems: items.length, pageSize, paged };
}
