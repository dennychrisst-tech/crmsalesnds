export type Sector = "Banking" | "Multifinance" | "Insurance" | "Health Care" | "Industrial" | "Technology" | "Telekomunikasi" | "Infrastruktur" | "Transportasi" | "Energy" | "Lainnya";
export type DealStage = "Lead" | "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type VisitStatus = "Planned" | "Done" | "Follow-up" | "No-go";
export type ProjectStatus = "Initiation" | "In Progress" | "On Hold" | "Delivered" | "Closed";

export interface Client {
  id: string;
  name: string;
  sector: Sector;
  pic: string[];
  contact: string;
  status: string;
  notes: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  client_id: string;
  date: string;
  purpose: string;
  approach: string;
  status: VisitStatus;
  pic: string;
  summary: string;
  created_at?: string;
}

export interface Deal {
  id: string;
  name: string;
  client_id: string;
  value: number;
  stage: DealStage;
  product: string;
  close_date: string;
  notes: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  product: string;
  status: ProjectStatus;
  value: number;
  golive: string;
  notes: string;
  created_at?: string;
}

export type ActiveView = "dashboard" | "calendar" | "clients" | "pipeline" | "projects";
