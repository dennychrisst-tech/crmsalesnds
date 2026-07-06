export type Sector = "Banking" | "Multifinance" | "Insurance" | "Health Care" | "Industrial" | "Technology" | "Telekomunikasi" | "Infrastruktur" | "Transportasi" | "Energy" | "Lainnya";
export type DealStage = "Approching" | "Present Solution" | "RFI" | "RFP/BRD" | "Clarification/Requirement" | "Proposal Teknis" | "Presentasi Proposal" | "POC/Demo" | "Offering Letter" | "Proposal Clarification" | "Negotiation" | "Dealed" | "PO" | "Kontrak" | "On Hold" | "Dropped";
export type VisitStatus = "Planned" | "Done" | "Cancel" | "Reschedule";
export type EventStatus = VisitStatus; // same vocabulary: Planned/Done/Cancel/Reschedule
export type ProjectStatus = "Initiation" | "In Progress" | "On Hold" | "Delivered" | "Closed";
export type TalentLevel = "Junior" | "Middle" | "Senior" | "Lead";
export type TalentRoleStatus = "Open" | "Close";
export type TaskStatus = "Open" | "Done";
export type RevenueLineCategory = "Project" | "Maintenance" | "Other";
export type RevenueMilestoneStatus = "Paid" | "Billed" | "To be billed" | "Can't be billed this year";
export type RevenueOppCategory = "H" | "M" | "L";
export type RevenueOppStatus = "Active" | "Hold" | "Drop";

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
  org_levels?: string[];
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
  org_level?: string;
  org_order?: number;
  reports_to_id?: string | null;
  created_by_id?: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  client_id: string;
  deal_id?: string | null;
  project_id?: string | null;
  date: string;
  purpose: string;
  approach: string;
  status: VisitStatus;
  pic: string;
  pic_client: string;
  jabatan: string;
  followup_date?: string | null;
  summary: string;
  rescheduled_to_id?: string | null;
  rescheduled_from_id?: string | null;
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
  // Revenue Forecast opportunity fields (merged from the old revenue_opportunities table).
  // Optional here since the DB has defaults for all of them — quick-create flows
  // (VisitModal, TaskModal, Pipeline's drag-project-to-stage) don't need to set these.
  year?: number | null;
  category?: string; // H/M/L
  potentially_billed_amount?: number;
  potentially_billed_percent?: number;
  team?: string;
  pmo?: string;
  plan?: string;
  presales?: string;
  sales?: string;
  archived?: boolean;
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

export type ActiveView = "dashboard" | "calendar" | "clients" | "pipeline" | "projects" | "opty" | "talent" | "tasks" | "catalog" | "summary" | "visit-report" | "weekly-report" | "revenue-forecast" | "talent-fill-rate" | "mandays-rate";

// Revenue Forecast — annual target vs. contracted revenue vs. opportunity
// pipeline (mirrors the team's yearly forecast workbook).
export interface RevenueMilestone {
  id: string;
  label: string;
  percent: number;
  amount: number;
  target_month: string | null; // "YYYY-MM"
  status: RevenueMilestoneStatus;
}

export interface RevenueTarget {
  id: string;
  year: number;
  target_revenue: number;
  total_mandays: number;
  mandays_per_year: number;
  rate: number;
  resource_count: number;
  created_by_id?: string;
  created_at?: string;
}

export interface RevenueLine {
  id: string;
  year: number;
  category: RevenueLineCategory;
  project_name: string;
  pic: string;
  milestones: RevenueMilestone[];
  notes: string;
  deal_id?: string | null;
  created_by_id?: string;
  created_at?: string;
}

export interface RevenueOpportunity {
  id: string;
  year: number;
  project_name: string;
  pic: string;
  category: RevenueOppCategory;
  amount: number;
  target_closing_date?: string | null;
  team: string;
  pmo: string;
  plan: string;
  product: string;
  potentially_billed_amount: number;
  potentially_billed_percent: number;
  presales: string;
  sales: string;
  status: RevenueOppStatus;
  reason: string;
  notes: string;
  created_by_id?: string;
  created_at?: string;
}

export interface MandaysRole {
  id: string;
  role_name: string;
  cogs: number;
  low_rate: number;
  med_rate: number;
  max_price: number;
  created_by_id?: string;
  created_at?: string;
}

export interface MandaysClientRate {
  id: string;
  role_id: string;
  client_label: string;
  rate_label: string;
  rate_value: number;
  classification: string;
  notes: string;
  created_by_id?: string;
  created_at?: string;
}

export type UserRole = "super_admin" | "admin" | "employee" | "viewer";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}
