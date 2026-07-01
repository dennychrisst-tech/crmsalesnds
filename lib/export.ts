import { Client, Deal, Visit, PIC } from "@/types";
import { todayStr } from "./utils";

function csv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportClients(clients: Client[], clientDeals: (id: string) => number) {
  const header = ["Nama", "Sektor", "Status", "PIC", "Telepon PIC", "Website", "Alamat", "Ukuran Perusahaan", "Catatan", "Project Aktif"];
  const rows = clients.map(c => {
    const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
    return [
      c.name, c.sector, c.status,
      pics.map(p => p.name).join("; "),
      pics.map(p => p.phone).join("; "),
      c.website || "", c.address || "", c.company_size || "", c.notes || "",
      clientDeals(c.id),
    ];
  });
  download(`clients_${today()}.csv`, csv([header, ...rows]));
}

export function exportDeals(deals: Deal[], clientName: (id: string) => string) {
  const header = ["Nama Project", "Client", "Stage", "Tipe Project", "Owner", "Nilai (Rp)", "Target Closing", "Produk", "Kompetitor", "Alasan Win/Loss", "Catatan"];
  const rows = deals.map(d => [
    d.name, clientName(d.client_id), d.stage, d.deal_type || "", d.owner || "",
    d.value, d.close_date || "", d.product || "", d.competitor || "",
    d.win_loss_reason || "", d.notes || "",
  ]);
  download(`pipeline_projects_${today()}.csv`, csv([header, ...rows]));
}

export function exportVisits(visits: Visit[], clientName: (id: string) => string) {
  const header = ["Tanggal", "Client", "PIC Client", "PIC NDS", "Jenis Approach", "Tujuan", "Status", "Summary"];
  const rows = visits.map(v => [
    v.date, clientName(v.client_id), v.pic_client || "", v.pic || "",
    v.approach || "", v.purpose || "", v.status, v.summary || "",
  ]);
  download(`visits_${today()}.csv`, csv([header, ...rows]));
}

export function exportVisitReport(visits: Visit[], clientName: (id: string) => string) {
  const header = ["Tanggal", "Client", "PIC NDS", "PIC Client", "Jenis Approach", "Tujuan Visit", "Summary / Hasil", "Status"];
  const rows = visits.map(v => [
    v.date, clientName(v.client_id), v.pic || "", v.pic_client || "",
    v.approach || "", v.purpose || "", v.summary || "", v.status,
  ]);
  download(`visit_report_${today()}.csv`, csv([header, ...rows]));
}

const today = todayStr;
