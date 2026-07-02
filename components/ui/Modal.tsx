"use client";
import { useEffect, useRef, useState } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  // Swipe-down-to-close (mobile bottom-sheet gesture) — tracked only from the
  // handle/title area so it never fights with scrolling the modal body.
  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (dragY > 90) onClose();
    setDragY(0);
    touchStartY.current = null;
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-[rgba(11,27,43,.45)] flex items-end sm:items-start justify-center sm:p-10 z-[90]"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose(); }}
    >
      <div
        ref={ref}
        className="modal-card bg-[var(--card)] w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : { transition: "transform .18s ease" }}
      >
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex-shrink-0">
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="w-9 h-1 rounded-full bg-[var(--line)]" />
          </div>
          <h3 className="text-lg font-bold p-4 sm:p-6 pb-3 sm:pb-4">{title}</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
          {children}
        </div>
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
  return (
    <div className="flex gap-2 justify-end mt-5 sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 pt-3 pb-4 sm:pb-6 bg-[var(--card)] border-t border-[var(--line)]">
      {children}
    </div>
  );
}
