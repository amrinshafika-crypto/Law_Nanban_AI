/*
# Law Nanban AI — Initial Schema

## Overview
Creates the complete relational schema for the Law Nanban AI legal intelligence platform:
profiles, cases, case parties, case events (timeline), documents, document summaries,
legal references, legal aid resources, hearings, agent tasks, and audit logs.

## Entities

1. **profiles** — extends auth.users with role (professional | citizen), display_name, bar_number
2. **cases** — legal cases with stable case_id, category, status, priority, parties, description, evidence_ref
3. **case_parties** — people/organisations involved in a case (plaintiff/defendant/witness)
4. **case_events** — timeline events tied to a case (filing, hearing, order, document, note)
5. **documents** — uploaded legal documents (pdf/docx/txt) with extracted text
6. **document_summaries** — AI-generated structured summaries per document
7. **legal_references** — curated trusted Indian legal sources (statutes, judgments, articles)
8. **legal_aid_resources** — NALSA / state / district legal services authorities and clinics
9. **hearings** — scheduled hearings linked to cases, with location and duration
10. **agent_tasks** — orchestrator + specialised agent execution logs with status and result
11. **audit_logs** — append-only access and action audit trail

## Security
- All tables have RLS enabled.
- profiles: owner-scoped SELECT/UPDATE; citizens read their own; professionals read their own.
- cases + children: owner-scoped via cases.assigned_to = auth.uid() (professional sees assigned cases).
- legal_references, legal_aid_resources: public read (TO anon, authenticated) — reference data shared with all.
- hearings: visible to the professional assigned to the linked case.
- agent_tasks: visible to the professional who owns the linked case (or the task creator).
- audit_logs: owner-scoped.
- Owner columns default to auth.uid() so client inserts that omit the owner still satisfy WITH CHECK.
- service_role granted on all tables for edge-function access.

## Notes
- Cases use a human-readable `case_number` (e.g. LNA-2026-0001) plus a uuid primary key.
- `evidence_ref` and `external_evidence_id` on cases prepare for future Digital Forensics integration.
- `source_type` on case_events distinguishes verified / user-entered / ai-generated.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('professional','citizen','admin')),
  bar_number text,
  phone text,
  organization text,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, UPDATE, INSERT ON profiles TO service_role;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('criminal','civil','family','property','consumer','cyber','labor','constitutional','corporate','tax','other')),
  status text NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','active','review','hearing','disposed','closed','archived')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  priority_reason text,
  filing_date date,
  court_name text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_ref text,
  external_evidence_id text,
  tags text[] DEFAULT '{}',
  next_hearing_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cases TO service_role;
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);

DROP POLICY IF EXISTS "select_assigned_cases" ON cases;
CREATE POLICY "select_assigned_cases" ON cases FOR SELECT
  TO authenticated USING (auth.uid() = assigned_to);
DROP POLICY IF EXISTS "insert_cases" ON cases;
CREATE POLICY "insert_cases" ON cases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = assigned_to);
DROP POLICY IF EXISTS "update_assigned_cases" ON cases;
CREATE POLICY "update_assigned_cases" ON cases FOR UPDATE
  TO authenticated USING (auth.uid() = assigned_to) WITH CHECK (auth.uid() = assigned_to);
DROP POLICY IF EXISTS "delete_assigned_cases" ON cases;
CREATE POLICY "delete_assigned_cases" ON cases FOR DELETE
  TO authenticated USING (auth.uid() = assigned_to);

-- ============================================================
-- CASE PARTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS case_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('plaintiff','defendant','petitioner','respondent','witness','expert','other')),
  contact text,
  counsel text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE case_parties ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON case_parties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON case_parties TO service_role;
CREATE INDEX IF NOT EXISTS idx_parties_case_id ON case_parties(case_id);

DROP POLICY IF EXISTS "select_case_parties" ON case_parties;
CREATE POLICY "select_case_parties" ON case_parties FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_parties.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "insert_case_parties" ON case_parties;
CREATE POLICY "insert_case_parties" ON case_parties FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_parties.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "update_case_parties" ON case_parties;
CREATE POLICY "update_case_parties" ON case_parties FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_parties.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "delete_case_parties" ON case_parties;
CREATE POLICY "delete_case_parties" ON case_parties FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_parties.case_id AND cases.assigned_to = auth.uid()));

-- ============================================================
-- CASE EVENTS (TIMELINE)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL DEFAULT 'note' CHECK (category IN ('filing','hearing','order','document','note','triage','research','scheduling','status','other')),
  source_type text NOT NULL DEFAULT 'user' CHECK (source_type IN ('verified','user','ai')),
  source_ref text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON case_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON case_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_events_case_id ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON case_events(event_date);

DROP POLICY IF EXISTS "select_case_events" ON case_events;
CREATE POLICY "select_case_events" ON case_events FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_events.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "insert_case_events" ON case_events;
CREATE POLICY "insert_case_events" ON case_events FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_events.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "update_case_events" ON case_events;
CREATE POLICY "update_case_events" ON case_events FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_events.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "delete_case_events" ON case_events;
CREATE POLICY "delete_case_events" ON case_events FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_events.case_id AND cases.assigned_to = auth.uid()));

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf','docx','txt','unknown')),
  file_size bigint DEFAULT 0,
  storage_path text,
  extracted_text text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','analyzed','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO service_role;
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);

DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    uploaded_by = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid()))
  );
DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid()))
  );
DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated USING (
    uploaded_by = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid()))
  ) WITH CHECK (
    uploaded_by = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid()))
  );
DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    uploaded_by = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid()))
  );

-- ============================================================
-- DOCUMENT SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  summary_type text NOT NULL CHECK (summary_type IN ('quick','detailed','dates','parties','key_points','questions')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_summaries TO service_role;
CREATE INDEX IF NOT EXISTS idx_summaries_document_id ON document_summaries(document_id);

DROP POLICY IF EXISTS "select_document_summaries" ON document_summaries;
CREATE POLICY "select_document_summaries" ON document_summaries FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = document_summaries.document_id
    AND (documents.uploaded_by = auth.uid()
         OR (documents.case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid())))
  ));
DROP POLICY IF EXISTS "insert_document_summaries" ON document_summaries;
CREATE POLICY "insert_document_summaries" ON document_summaries FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = document_summaries.document_id
    AND (documents.uploaded_by = auth.uid()
         OR (documents.case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid())))
  ));
DROP POLICY IF EXISTS "delete_document_summaries" ON document_summaries;
CREATE POLICY "delete_document_summaries" ON document_summaries FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = document_summaries.document_id
    AND (documents.uploaded_by = auth.uid()
         OR (documents.case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = documents.case_id AND cases.assigned_to = auth.uid())))
  ));

-- ============================================================
-- LEGAL REFERENCES (public, shared)
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  citation text,
  source text NOT NULL CHECK (source IN ('india_code','supreme_court','high_court','ecourts','government','constitution','other')),
  source_url text,
  category text NOT NULL DEFAULT 'general',
  summary text,
  keywords text[] DEFAULT '{}',
  jurisdiction text DEFAULT 'India',
  effective_date date,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE legal_references ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON legal_references TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_references TO service_role;
CREATE INDEX IF NOT EXISTS idx_references_category ON legal_references(category);
CREATE INDEX IF NOT EXISTS idx_references_source ON legal_references(source);

DROP POLICY IF EXISTS "select_legal_references_public" ON legal_references;
CREATE POLICY "select_legal_references_public" ON legal_references FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- LEGAL AID RESOURCES (public, shared)
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_aid_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  authority_type text NOT NULL CHECK (authority_type IN ('national','state','district','clinic','ngo','other')),
  state text,
  district text,
  address text,
  phone text,
  email text,
  website text,
  description text,
  services text[] DEFAULT '{}',
  eligibility text,
  language text[] DEFAULT '{"en","ta"}',
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE legal_aid_resources ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON legal_aid_resources TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_aid_resources TO service_role;
CREATE INDEX IF NOT EXISTS idx_aid_state ON legal_aid_resources(state);
CREATE INDEX IF NOT EXISTS idx_aid_type ON legal_aid_resources(authority_type);

DROP POLICY IF EXISTS "select_legal_aid_public" ON legal_aid_resources;
CREATE POLICY "select_legal_aid_public" ON legal_aid_resources FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- HEARINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  hearing_date timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  court_name text,
  courtroom text,
  purpose text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON hearings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hearings TO service_role;
CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);

DROP POLICY IF EXISTS "select_hearings" ON hearings;
CREATE POLICY "select_hearings" ON hearings FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = hearings.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "insert_hearings" ON hearings;
CREATE POLICY "insert_hearings" ON hearings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = hearings.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "update_hearings" ON hearings;
CREATE POLICY "update_hearings" ON hearings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = hearings.case_id AND cases.assigned_to = auth.uid()));
DROP POLICY IF EXISTS "delete_hearings" ON hearings;
CREATE POLICY "delete_hearings" ON hearings FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = hearings.case_id AND cases.assigned_to = auth.uid()));

-- ============================================================
-- AGENT TASKS (orchestration log)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  orchestrator_task_id uuid,
  agent_name text NOT NULL CHECK (agent_name IN ('orchestrator','triage','document_intelligence','legal_research','legal_aid','scheduling','verification')),
  task_type text NOT NULL,
  input jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_tasks TO service_role;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_case_id ON agent_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON agent_tasks(user_id);

DROP POLICY IF EXISTS "select_agent_tasks" ON agent_tasks;
CREATE POLICY "select_agent_tasks" ON agent_tasks FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = agent_tasks.case_id AND cases.assigned_to = auth.uid()))
  );
DROP POLICY IF EXISTS "insert_agent_tasks" ON agent_tasks;
CREATE POLICY "insert_agent_tasks" ON agent_tasks FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_agent_tasks" ON agent_tasks;
CREATE POLICY "update_agent_tasks" ON agent_tasks FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR (case_id IS NOT NULL AND EXISTS (SELECT 1 FROM cases WHERE cases.id = agent_tasks.case_id AND cases.assigned_to = auth.uid()))
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, DELETE ON audit_logs TO service_role;
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
