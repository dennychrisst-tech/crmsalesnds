import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Visit } from "@/types";
import { fmtIDR, fmtDate, todayStr } from "./utils";

// Static brand identity, not fetched from app_settings — company_name there
// is admin-only (see /api/admin/settings) and this report is generated
// client-side for any logged-in sales user. Matches how the login page
// already hardcodes the same name rather than treating it as a live setting.
export const COMPANY_NAME = "PT Nusantara Duta Solusindo";

// Best-effort: embeds the real logo if it loads, but a failed/slow fetch
// shouldn't block the export — the letterhead still reads fine as text-only.
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawLetterhead(doc: jsPDF, logo: string | null, title: string, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (logo) {
    try { doc.addImage(logo, "PNG", 14, 10, 32, 13); } catch { /* corrupt/unsupported image — skip, text header still renders */ }
  }
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(COMPANY_NAME, pageWidth - 14, 16, { align: "right" });

  let y = 30;
  doc.setDrawColor(210);
  doc.line(14, y, pageWidth - 14, y);
  y += 9;
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(subtitle, 14, y);
  return y + 8;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Dicetak ${fmtDate(todayStr())} · ${COMPANY_NAME}`, 14, h - 10);
    doc.text(`${i}/${pageCount}`, w - 14, h - 10, { align: "right" });
  }
}

interface WeeklyReportKpis {
  visitDone: number;
  clientCount: number;
  pipelineUpdates: number;
  wonCount: number;
  wonValue: number;
}

export async function exportWeeklyReportPdf(
  salesData: { name: string; visits: Visit[]; rescheduledVisits?: Visit[]; cancelledVisits?: Visit[] }[],
  clientName: (id: string) => string,
  label: string,
  kpis: WeeklyReportKpis
) {
  const doc = new jsPDF();
  const logo = await loadLogoDataUrl();
  let y = drawLetterhead(doc, logo, "Laporan Mingguan Sales", `Periode: ${label}`);

  autoTable(doc, {
    startY: y,
    head: [["Visit Selesai", "Client Dikunjungi", "Update Pipeline", "Closed Won"]],
    body: [[
      String(kpis.visitDone), String(kpis.clientCount), String(kpis.pipelineUpdates),
      kpis.wonCount ? `${kpis.wonCount} (${fmtIDR(kpis.wonValue)})` : "0",
    ]],
    theme: "grid",
    headStyles: { fillColor: [10, 110, 92] },
    margin: { left: 14, right: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  for (const s of salesData) {
    const hasRows = s.visits.length || (s.rescheduledVisits?.length ?? 0) || (s.cancelledVisits?.length ?? 0);
    if (!hasRows) continue;
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(s.name, 14, y);
    y += 5;

    const rows = [
      ...s.visits.map(v => [fmtDate(v.date), clientName(v.client_id), "Done", (v.summary || "").slice(0, 90)]),
      ...(s.rescheduledVisits || []).map(v => [fmtDate(v.date), clientName(v.client_id), "Reschedule", (v.reschedule_reason || "").slice(0, 90)]),
      ...(s.cancelledVisits || []).map(v => [fmtDate(v.date), clientName(v.client_id), "Cancel", (v.cancel_reason || "").slice(0, 90)]),
    ].sort((a, b) => a[0].localeCompare(b[0]));

    autoTable(doc, {
      startY: y,
      head: [["Tanggal", "Client", "Status", "Catatan"]],
      body: rows,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [230, 230, 230], textColor: 30 },
      margin: { left: 14, right: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  drawFooter(doc);
  doc.save(`laporan_mingguan_${label.replace(/[^\w]+/g, "_")}.pdf`);
}
