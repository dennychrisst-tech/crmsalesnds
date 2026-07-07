import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Stub until Phase 3 of the route migration — see components/LegacyViewSwitch.tsx.
export default function TalentFillRatePage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="talent-fill-rate" />
    </Suspense>
  );
}
