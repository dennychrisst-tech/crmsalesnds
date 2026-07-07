import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Stub until Phase 4 of the route migration — see components/LegacyViewSwitch.tsx.
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="calendar" />
    </Suspense>
  );
}
