"use client";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { onActivateKey } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export default function SortableTh({ children, active, dir, onClick }: {
  children: React.ReactNode; active: boolean; dir?: SortDir; onClick: () => void;
}) {
  return (
    <th className="sortable-th" onClick={onClick} onKeyDown={onActivateKey(onClick)} tabIndex={0}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <span className="sortable-th-inner">
        {children}
        {active
          ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronsUpDown size={12} className="sortable-th-icon-idle" />}
      </span>
    </th>
  );
}
