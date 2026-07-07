import { Suspense } from "react";
import LegacyViewSwitch from "@/components/LegacyViewSwitch";

// Stub until Phase 2 of the route migration — see components/LegacyViewSwitch.tsx.
export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <LegacyViewSwitch view="tasks" />
    </Suspense>
  );
}
