"use client";
import { createContext, useContext, ReactNode } from "react";
import { useData } from "@/hooks/useData";
import { toast } from "@/components/ui/Toast";

type UseDataReturn = ReturnType<typeof useData>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

interface CRMDataValue extends UseDataReturn {
  isViewer: boolean;
  isAdmin: boolean;
  // Wraps a mutation callback so a viewer gets a read-only toast instead of
  // actually calling it — was the local ro() helper in CRMApp.tsx, now
  // shared by every page instead of being recomputed per view.
  ro: <T extends AnyFn>(fn: T) => T | (() => Promise<void>);
}

// Wraps hooks/useData.ts's return value once per session (see
// app/(crm)/layout.tsx) so every page under the (crm) route group reads the
// same already-loaded data/mutations instead of each page re-fetching —
// Next.js layouts persist across sibling-route navigation, so this provider
// isn't remounted when the user switches tabs.
const CRMDataContext = createContext<CRMDataValue | null>(null);

export function CRMDataProvider({ children }: { children: ReactNode }) {
  const dataHook = useData();
  const { currentProfile } = dataHook;
  const isViewer = currentProfile?.role === "viewer";
  const isAdmin = !!currentProfile && ["super_admin", "admin"].includes(currentProfile.role);
  const ro = <T extends AnyFn>(fn: T): T | (() => Promise<void>) =>
    isViewer
      ? () => { toast("Anda hanya memiliki akses lihat (view only).", { type: "error" }); return Promise.resolve(); }
      : fn;

  const value: CRMDataValue = { ...dataHook, isViewer, isAdmin, ro };
  return <CRMDataContext.Provider value={value}>{children}</CRMDataContext.Provider>;
}

export function useCRMData() {
  const ctx = useContext(CRMDataContext);
  if (!ctx) throw new Error("useCRMData must be used within a CRMDataProvider");
  return ctx;
}
