import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Dashboard — stub until Phase 4 of the route migration gives it its own
// page.tsx (it's the highest-traffic, most cross-linked view, so it moves
// last). Suspense is required here because LegacyViewSwitch reads
// useSearchParams() internally.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="dashboard" />
    </Suspense>
  );
}
