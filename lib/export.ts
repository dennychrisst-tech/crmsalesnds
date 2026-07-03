import ExcelJS from "exceljs";
import { Client, Deal, Visit, PIC } from "@/types";
import { todayStr } from "./utils";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A6E5C" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };

interface ColumnDef<T> {
  header: string;
  width?: number;
  wrap?: boolean;
  numFmt?: string;
  value: (row: T) => string | number;
}

// Builds one sheet with a bold/colored header row, sensible column widths,
// wrapped long-text cells, and the header frozen + auto-filterable — a plain
// CSV can't carry any of that, which is why opening one in Excel always
// looked like an unformatted wall of text regardless of the data itself.
async function buildWorkbook<T>(sheetName: string, columns: ColumnDef<T>[], rows: T[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = columns.map(c => ({ header: c.header, width: c.width ?? 18, style: c.numFmt ? { numFmt: c.numFmt } : undefined }));
  ws.getRow(1).eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  rows.forEach(row => {
    const values = columns.map(c => c.value(row));
    const excelRow = ws.addRow(values);
    columns.forEach((c, i) => {
      if (c.wrap) excelRow.getCell(i + 1).alignment = { wrapText: true, vertical: "top" };
    });
  });

  return wb;
}

async function download(filename: string, wb: ExcelJS.Workbook) {
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportClients(clients: Client[], clientDeals: (id: string) => number) {
  const columns: ColumnDef<Client>[] = [
    { header: "Nama", width: 26, value: c => c.name },
    { header: "Sektor", width: 16, value: c => c.sector },
    { header: "Status", width: 14, value: c => c.status },
    { header: "PIC", width: 24, wrap: true, value: c => ((Array.isArray(c.pic) ? c.pic : []) as PIC[]).map(p => p.name).join("; ") },
    { header: "Telepon PIC", width: 20, value: c => ((Array.isArray(c.pic) ? c.pic : []) as PIC[]).map(p => p.phone).join("; ") },
    { header: "Website", width: 26, value: c => c.website || "" },
    { header: "Alamat", width: 34, wrap: true, value: c => c.address || "" },
    { header: "Ukuran Perusahaan", width: 18, value: c => c.company_size || "" },
    { header: "Catatan", width: 34, wrap: true, value: c => c.notes || "" },
    { header: "Project Aktif", width: 12, value: c => clientDeals(c.id) },
  ];
  const wb = await buildWorkbook("Clients", columns, clients);
  await download(`clients_${today()}.xlsx`, wb);
}

export async function exportDeals(deals: Deal[], clientName: (id: string) => string) {
  const columns: ColumnDef<Deal>[] = [
    { header: "Nama Project", width: 32, wrap: true, value: d => d.name },
    { header: "Client", width: 22, value: d => clientName(d.client_id) },
    { header: "Stage", width: 20, value: d => d.stage },
    { header: "Tipe Project", width: 16, value: d => d.deal_type || "" },
    { header: "Owner", width: 14, value: d => d.owner || "" },
    { header: "Nilai (Rp)", width: 18, numFmt: "#,##0", value: d => d.value },
    { header: "Target Closing", width: 14, value: d => d.close_date || "" },
    { header: "Produk", width: 18, value: d => d.product || "" },
    { header: "Kompetitor", width: 16, value: d => d.competitor || "" },
    { header: "Alasan Win/Loss", width: 28, wrap: true, value: d => d.win_loss_reason || "" },
    { header: "Catatan", width: 30, wrap: true, value: d => d.notes || "" },
  ];
  const wb = await buildWorkbook("Pipeline", columns, deals);
  await download(`pipeline_projects_${today()}.xlsx`, wb);
}

export async function exportVisits(visits: Visit[], clientName: (id: string) => string) {
  const columns: ColumnDef<Visit>[] = [
    { header: "Tanggal", width: 12, value: v => v.date },
    { header: "Client", width: 22, value: v => clientName(v.client_id) },
    { header: "PIC Client", width: 18, value: v => v.pic_client || "" },
    { header: "PIC NDS", width: 18, value: v => v.pic || "" },
    { header: "Jenis Approach", width: 16, value: v => v.approach || "" },
    { header: "Tujuan", width: 28, wrap: true, value: v => v.purpose || "" },
    { header: "Status", width: 12, value: v => v.status },
    { header: "Summary", width: 34, wrap: true, value: v => v.summary || "" },
  ];
  const wb = await buildWorkbook("Visits", columns, visits);
  await download(`visits_${today()}.xlsx`, wb);
}

export async function exportVisitReport(visits: Visit[], clientName: (id: string) => string) {
  const columns: ColumnDef<Visit>[] = [
    { header: "Tanggal", width: 12, value: v => v.date },
    { header: "Client", width: 22, value: v => clientName(v.client_id) },
    { header: "PIC NDS", width: 18, value: v => v.pic || "" },
    { header: "PIC Client", width: 18, value: v => v.pic_client || "" },
    { header: "Jenis Approach", width: 16, value: v => v.approach || "" },
    { header: "Tujuan Visit", width: 28, wrap: true, value: v => v.purpose || "" },
    { header: "Summary / Hasil", width: 34, wrap: true, value: v => v.summary || "" },
    { header: "Status", width: 12, value: v => v.status },
  ];
  const wb = await buildWorkbook("Laporan Visit", columns, visits);
  await download(`visit_report_${today()}.xlsx`, wb);
}

export async function exportWeeklyReport(
  salesData: { name: string; visits: Visit[] }[],
  clientName: (id: string) => string,
  relatedDeal: (v: Visit) => Deal | null,
  label: string
) {
  interface Row { name: string; v: Visit; deal: Deal | null }
  const rows: Row[] = [];
  salesData.forEach(s => s.visits.forEach(v => rows.push({ name: s.name, v, deal: relatedDeal(v) })));

  const columns: ColumnDef<Row>[] = [
    { header: "Sales", width: 14, value: r => r.name },
    { header: "Tanggal", width: 12, value: r => r.v.date },
    { header: "Client", width: 22, value: r => clientName(r.v.client_id) },
    { header: "Jenis Approach", width: 16, value: r => r.v.approach || "" },
    { header: "Hasil Visit", width: 34, wrap: true, value: r => r.v.summary || "" },
    { header: "Deal Terkait", width: 26, wrap: true, value: r => r.deal?.name || "" },
    { header: "Stage", width: 18, value: r => r.deal?.stage || "" },
  ];
  const wb = await buildWorkbook("Laporan Mingguan", columns, rows);
  await download(`laporan_mingguan_${label.replace(/[^\w]+/g, "_")}.xlsx`, wb);
}

const today = todayStr;
