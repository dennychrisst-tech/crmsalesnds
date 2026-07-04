"use client";
import { useState } from "react";

// Mobile-only "Filter" button that opens a bottom-sheet holding duplicate
// filter controls (bound to the same state as the desktop inline dropdowns,
// which are hidden on mobile via the .filter-inline CSS rule).
export default function FilterSheet({ children, label = "Filter" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm filter-sheet-trigger" aria-label={label} onClick={() => setOpen(true)}>
        ▤ {label}
      </button>
      {open && (
        <div className="more-sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <div className="filter-sheet-body">{children}</div>
            <button type="button" className="btn filter-sheet-close" onClick={() => setOpen(false)}>Terapkan</button>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-sheet-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
