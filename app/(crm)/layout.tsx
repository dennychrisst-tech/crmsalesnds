"use client";
import { CRMDataProvider } from "@/contexts/CRMDataContext";
import CrmShell from "@/components/nav/CrmShell";

// Wraps every CRM tab's route (dashboard, clients, pipeline, opty, ...).
// CRMDataProvider calls useData() exactly once per session — Next.js layouts
// persist across sibling-route navigation, so switching tabs doesn't refetch
// or reset app state, same as today's tab-switching inside one page.
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <CRMDataProvider>
      <CrmShell>{children}</CrmShell>
    </CRMDataProvider>
  );
}
