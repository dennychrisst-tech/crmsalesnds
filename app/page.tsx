import { Suspense } from "react";
import CRMApp from "@/components/CRMApp";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <CRMApp />
    </Suspense>
  );
}
