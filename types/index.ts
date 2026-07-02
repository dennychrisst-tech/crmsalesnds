export type Sector = "Banking" | "Multifinance" | "Insurance" | "Health Care" | "Industrial" | "Technology" | "Telekomunikasi" | "Infrastruktur" | "Transportasi" | "Energy" | "Lainnya";
export type DealStage = "Approching" | "Present Solution" | "RFI" | "RFP/BRD" | "Clarification/Requirement" | "Proposal Teknis" | "Presentasi Proposal" | "POC/Demo" | "Offering Letter" | "Proposal Clarification" | "Negotiation" | "Dealed" | "PO" | "Kontrak" | "On Hold" | "Dropped";
export type VisitStatus = "Planned" | "Done" | "Cancel" | "Reschedule";
export type EventStatus = VisitStatus; // same vocabulary: Planned/Done/Cancel/Reschedule
export type ProjectStatus = "Initiation" | "In Progress" | "On Hold" | "Delivered" | "Closed";
export type TalentLevel = "Junior" | "Middle" | "Senior" | "Lead";
export type TalentRoleStatus = "Open" | "Close";
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
  logo_url?: string | null;
  created_by_id?: string;
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
  created_by_id?: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  client_id: string;
  deal_id?: string | null;
  project?: string | null;
  date: string;
  purpose: string;
  approach: string;
  status: VisitStatus;
  pic: string;
  pic_client: string;
  jabatan: string;
  followup_date?: string | null;
  summary: string;
  created_by_id?: string;
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
  competitor: string;
  stage_updated_at?: string;
  created_by_id?: string;
  created_at?: string;
}

export interface Activity {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  type: string;
  description: string;
  date?: string | null;
  created_by: string;
  created_by_id?: string;
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
  partner?: string;
  created_by_id?: string;
  created_at?: string;
}

// Talent (outsourcing/staffing) tracking — a Project with product === "Talent"
// can have several requisition batches (TalentRole; "Name Project" rows in the
// team's Excel tracker), each for one role, with CV outcomes tallied as counts
// (req_cv/cv_submitted/cv_reject/cv_not_response/po_issued) matching that sheet.
export interface TalentRole {
  id: string;
  project_id: string;
  name: string;
  role_name: string;
  level: string;
  ratecard: number;
  pic: string;
  deadline?: string | null;
  status: TalentRoleStatus;
  req_cv: number;
  cv_submitted: number;
  cv_reject: number;
  cv_not_response: number;
  po_issued: number;
  notes: string;
  created_by_id?: string;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string;
  client_id: string | null;
  deal_id: string | null;
  pic_client: string;
  assigned_to: string;
  status: TaskStatus;
  notes: string;
  created_by_id?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  created_by_id?: string;
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
  created_by_id?: string;
  created_at?: string;
}

export interface Attachment {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  created_by_id?: string;
  uploaded_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
  created_by: string;
  client_id?: string | null;
  status: EventStatus;
  followup_date?: string | null;
  created_by_id?: string;
  created_at?: string;
}

export type ActiveView = "dashboard" | "calendar" | "clients" | "pipeline" | "projects" | "tasks" | "catalog" | "summary" | "visit-report" | "weekly-report";

export type UserRole = "super_admin" | "admin" | "employee" | "viewer";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}
