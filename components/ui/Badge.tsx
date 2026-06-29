import { stageBadgeClass, visitStatusClass } from "@/lib/utils";

export function StageBadge({ stage }: { stage: string }) {
  return <span className={`badge ${stageBadgeClass(stage)}`}>{stage}</span>;
}

export function VisitBadge({ status }: { status: string }) {
  return <span className={`badge ${visitStatusClass(status)}`}>{status}</span>;
}
