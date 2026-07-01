"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { inputCls } from "./Modal";

export interface SearchableOption {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Label for a "clear selection" row, e.g. "— Tidak ada —". Omit for required fields. */
  clearLabel?: string;
  /** Called with the typed text when the user picks the "create new" row. */
  onCreate?: (query: string) => void;
  /** Customize the "create new" row's text. Defaults to `+ Buat baru: "query"`. */
  createLabel?: (query: string) => string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Cari & pilih…", clearLabel, onCreate, createLabel }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) || null;
  const displayValue = open ? query : (selected ? selected.label : "");

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === (selected?.label || "").toLowerCase()) return options;
    return options.filter(o => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q));
  }, [options, query, selected]);

  const trimmedQuery = query.trim();
  const exactMatch = !!trimmedQuery && options.some(o => o.label.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreate = !!onCreate && !!trimmedQuery && !exactMatch;

  function openDropdown() {
    setQuery(selected ? selected.label : "");
    setOpen(true);
    setHighlight(0);
  }

  function pick(opt: SearchableOption | null) {
    onChange(opt ? opt.value : "");
    setOpen(false);
  }

  function create() {
    if (!onCreate || !trimmedQuery) return;
    onCreate(trimmedQuery);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") openDropdown();
      return;
    }
    const itemCount = filtered.length + (showCreate ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, itemCount - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < filtered.length) { if (filtered[highlight]) pick(filtered[highlight]); }
      else create();
    } else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={ref} className="relative">
      <input
        className={inputCls}
        value={displayValue}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-lg">
          {clearLabel && (
            <div
              className="px-3 py-2 text-sm cursor-pointer text-[var(--ink-soft)] hover:bg-[var(--paper)]"
              onMouseDown={e => { e.preventDefault(); pick(null); }}
            >
              {clearLabel}
            </div>
          )}
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-[var(--ink-soft)]">Tidak ada hasil</div>
          )}
          {filtered.map((o, i) => (
            <div
              key={o.value}
              className={`px-3 py-2 text-sm cursor-pointer ${i === highlight ? "bg-[var(--paper)]" : ""} hover:bg-[var(--paper)]`}
              onMouseDown={e => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setHighlight(i)}
            >
              <div className="font-medium text-[var(--ink)]">{o.label}</div>
              {o.sub && <div className="text-xs text-[var(--ink-soft)]">{o.sub}</div>}
            </div>
          ))}
          {showCreate && (
            <div
              className={`px-3 py-2 text-sm cursor-pointer font-medium text-[var(--brand)] ${highlight === filtered.length ? "bg-[var(--paper)]" : ""} hover:bg-[var(--paper)]`}
              onMouseDown={e => { e.preventDefault(); create(); }}
              onMouseEnter={() => setHighlight(filtered.length)}
            >
              {createLabel ? createLabel(trimmedQuery) : `+ Buat baru: "${trimmedQuery}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
