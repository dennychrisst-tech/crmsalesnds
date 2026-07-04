"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const THEME_KEY = "crm_theme";

// The inline bootstrap script in app/layout.tsx already sets data-theme on
// <html> before first paint (see THEME_BOOTSTRAP there) — this hook just
// reads that already-applied value on mount so the toggle button renders the
// correct icon immediately, and owns switching/persisting it afterward.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark") setTheme("dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  }, []);

  return { theme, toggle };
}
