"use client";
import { useEffect, useState } from "react";

export interface ToastAction { label: string; onClick: () => void }
interface ToastMsg { id: number; text: string; type: "success" | "error"; action?: ToastAction }

let push: ((text: string, type: "success" | "error", action?: ToastAction) => void) | null = null;
let lastText = "";
let lastAt = 0;

// Fire-and-forget from anywhere (hooks, event handlers) — rendered by the
// single <ToastHost /> mounted in CRMApp.
export function toast(text: string, opts?: { type?: "success" | "error"; action?: ToastAction }) {
  // Multi-step saves (e.g. visit + auto-activity) call upsert back-to-back —
  // collapse identical toasts fired within a short window.
  const now = Date.now();
  if (!opts?.action && text === lastText && now - lastAt < 1500) return;
  lastText = text;
  lastAt = now;
  push?.(text, opts?.type ?? "success", opts?.action);
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    let seq = 0;
    push = (text, type, action) => {
      const id = ++seq;
      setToasts(prev => [...prev.slice(-2), { id, text, type, action }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), action ? 6000 : 2500);
    };
    return () => { push = null; };
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-undo"
              onClick={() => { t.action!.onClick(); setToasts(prev => prev.filter(x => x.id !== t.id)); }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
