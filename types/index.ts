export type Sector = "Banking" | "Multifinance" | "Insurance" | "Health Care" | "Industrial" | "Technology" | "Telekomunikasi" | "Infrastruktur" | "Transportasi" | "Energy" | "Lainnya";
export type DealStage = "Lead" | "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type VisitStatus = "Planned" | "Done" | "Follow-up" | "No-go";
export type ProjectStatus = "Initiation" | "In Progress" | "On Hold" | "Delivered" | "Closed";
export type TaskStatus = "Open" | "Done";

export interface PIC {
  name: string;
  phone: string;
}

export interface Client {
  id: string;
  name: string;
  sector: Sector;
  pic: PIC[];
  contact: string;
  status: string;
  notes: string;
  address?: string;
  website?: string;
  company_size?: string;
  created_at?: string;
}

export interface Contact {
  id: string;
  client_id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
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
  deal_type: string;
  product: string;
  close_date: string;
  notes: string;
  owner: string;
  win_loss_reason: string;
  created_at?: string;
}

export interface Activity {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  type: string;
  description: string;
  created_by: string;
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

export interface Task {
  id: string;
  title: string;
  due_date: string;
  client_id: string | null;
  deal_id: string | null;
  assigned_to: string;
  status: TaskStatus;
  notes: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at?: string;
}

export interface CRMDocument {
  id: string;
  deal_id: string;
  name: string;
  type: string;
  status: string;
  date: string;
  notes: string;
  created_at?: string;
}

export interface Attachment {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at?: string;
}

export type ActiveView = "dashboard" | "calendar" | "clients" | "pipeline" | "projects" | "tasks" | "catalog";
