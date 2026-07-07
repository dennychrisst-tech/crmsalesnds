import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Stub until Phase 4 of the route migration — see components/LegacyViewSwitch.tsx.
export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="pipeline" />
    </Suspense>
  );
}
