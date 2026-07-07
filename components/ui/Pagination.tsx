"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// Always includes first/last page and a window around the current page,
// collapsing the rest into "…" so the control stays a fixed width no matter
// how many pages there are.
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: Props) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination">
      <span className="pagination-info">{start}–{end} dari {totalItems}</span>
      <div className="pagination-controls">
        <button className="pagination-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeft size={15} />
        </button>
        {pageWindow(page, totalPages).map((p, i) => p === "…"
          ? <span key={`e${i}`} className="pagination-ellipsis">…</span>
          : (
            <button key={p} className={`pagination-btn${p === page ? " active" : ""}`} onClick={() => onPageChange(p)} aria-current={p === page ? "page" : undefined}>
              {p}
            </button>
          ))}
        <button className="pagination-btn" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Halaman berikutnya">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
