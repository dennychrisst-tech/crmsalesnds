import { stageBadgeClass, visitStatusClass } from "@/lib/utils";

export function StageBadge({ stage }: { stage: string }) {
  return <span className={`badge ${stageBadgeClass(stage)}`}>{stage}</span>;
}

export function VisitBadge({ status }: { status: string }) {
  const title = status === "Tentative" ? "Client & tanggal sudah pasti, tapi janji dengan PIC belum confirm — visit bisa saja tidak jadi ketemu" : undefined;
  const mark = status === "Cancel" ? "✕ " : "";
  return <span className={`badge ${visitStatusClass(status)}`} title={title}>{mark}{status}</span>;
}
