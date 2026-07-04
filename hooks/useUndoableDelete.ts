"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";

// Undo window matches Toast's own display duration for toasts with an action
// button (see components/ui/Toast.tsx) — the Undo button disappears exactly
// when the real delete fires, so there's no dead time where Undo is visible
// but no longer works.
const UNDO_WINDOW_MS = 6000;

// Soft-delete pattern for "data penting" (Client/Deal/Project): the row is
// hidden immediately, but the real delete is delayed until the undo window
// passes untouched. Unlike Pipeline's stage-move undo (which just reverses an
// already-committed mutation), a delete's cascade (e.g. Client -> Contacts/
// Deals/Projects, Deal -> Documents/Attachments/Activities) can't be
// losslessly recreated — so nothing is actually destroyed until the window
// expires, which makes "Undo" a real, full-fidelity restore rather than a
// best-effort one.
export function useUndoableDelete(onDelete: (id: string) => Promise<void>) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  const requestDelete = useCallback((id: string, label: string) => {
    setPendingIds(prev => new Set(prev).add(id));

    const timer = setTimeout(() => {
      timers.current.delete(id);
      onDelete(id).catch(() => {
        // Delete failed server-side — bring the row back instead of leaving
        // it permanently (and incorrectly) hidden.
        setPendingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      });
    }, UNDO_WINDOW_MS);
    timers.current.set(id, timer);

    toast(`${label} dihapus`, {
      action: {
        label: "Undo",
        onClick: () => {
          const t = timers.current.get(id);
          if (t) clearTimeout(t);
          timers.current.delete(id);
          setPendingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        },
      },
    });
  }, [onDelete]);

  return { isPending, requestDelete };
}
