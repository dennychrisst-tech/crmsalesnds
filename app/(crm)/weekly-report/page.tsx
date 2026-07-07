import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Stub until Phase 3 of the route migration — see components/LegacyViewSwitch.tsx.
export default function WeeklyReportPage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="weekly-report" />
    </Suspense>
  );
}
