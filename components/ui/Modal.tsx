"use client";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(11,27,43,.45)] flex items-start justify-center p-3 sm:p-10 z-50 overflow-y-auto"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose(); }}
    >
      <div ref={ref} className="bg-[var(--card)] rounded-2xl w-full max-w-xl p-4 sm:p-6 shadow-2xl">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-bold mb-1 text-[var(--ink-soft)] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full px-3 py-2 border border-[var(--line)] rounded-xl bg-white text-sm font-sans focus:outline-none focus:border-[var(--brand)]";
export const selectCls = inputCls;
export const textareaCls = inputCls + " min-h-[70px] resize-y";

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 justify-end mt-5">{children}</div>;
}
