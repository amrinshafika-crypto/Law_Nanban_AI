export type UserRole = 'professional' | 'citizen' | 'admin';

export type CaseCategory =
  | 'criminal' | 'civil' | 'family' | 'property' | 'consumer'
  | 'cyber' | 'labor' | 'constitutional' | 'corporate' | 'tax' | 'other';

export type CaseStatus =
  | 'intake' | 'active' | 'review' | 'hearing' | 'disposed' | 'closed' | 'archived';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type AgentName =
  | 'orchestrator' | 'triage' | 'document_intelligence'
  | 'legal_research' | 'legal_aid' | 'scheduling' | 'verification';

export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type EventCategory =
  | 'filing' | 'hearing' | 'order' | 'document'
  | 'note' | 'triage' | 'research' | 'scheduling' | 'status' | 'other';

export type SourceType = 'verified' | 'user' | 'ai';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  bar_number: string | null;
  phone: string | null;
  organization: string | null;
  preferred_language: 'en' | 'ta';
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  category: CaseCategory;
  status: CaseStatus;
  priority: Priority;
  priority_reason: string | null;
  filing_date: string | null;
  court_name: string | null;
  assigned_to: string | null;
  evidence_ref: string | null;
  external_evidence_id: string | null;
  tags: string[];
  next_hearing_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseParty {
  id: string;
  case_id: string;
  name: string;
  role: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'witness' | 'expert' | 'other';
  contact: string | null;
  counsel: string | null;
  notes: string | null;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  event_date: string;
  category: EventCategory;
  source_type: SourceType;
  source_ref: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  case_id: string | null;
  title: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'unknown';
  file_size: number;
  storage_path: string | null;
  extracted_text: string | null;
  uploaded_by: string | null;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  document_id: string;
  summary_type: 'quick' | 'detailed' | 'dates' | 'parties' | 'key_points' | 'questions';
  content: string;
  created_at: string;
}

export interface LegalReference {
  id: string;
  title: string;
  citation: string | null;
  source: string;
  source_url: string | null;
  category: string;
  summary: string | null;
  keywords: string[];
  jurisdiction: string;
  effective_date: string | null;
  verified: boolean;
}

export interface LegalSection {
  id: string;
  legal_reference_id: string;
  section_number: string;
  section_title: string | null;
  legal_text: string | null;
  source_page_start: number | null;
  source_page_end: number | null;
  source_url: string | null;
  consolidated_as_of: string | null;
  extraction_status: string | null;
  review_status: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalAidResource {
  id: string;
  name: string;
  authority_type: string;
  state: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  services: string[];
  eligibility: string | null;
  language: string[];
  verified: boolean;
}

export interface Hearing {
  id: string;
  case_id: string;
  title: string;
  hearing_date: string;
  duration_minutes: number;
  court_name: string | null;
  courtroom: string | null;
  purpose: string | null;
  status: 'scheduled' | 'completed' | 'adjourned' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export interface AgentTask {
  id: string;
  case_id: string | null;
  document_id: string | null;
  user_id: string | null;
  orchestrator_task_id: string | null;
  agent_name: AgentName;
  task_type: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  status: AgentTaskStatus;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
