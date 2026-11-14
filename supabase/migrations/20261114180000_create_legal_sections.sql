-- ============================================================
-- LEGAL SECTIONS (public, shared)
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_reference_id uuid NOT NULL REFERENCES legal_references(id) ON DELETE CASCADE,
  section_number text NOT NULL,
  section_title text,
  legal_text text,
  source_page_start integer,
  source_page_end integer,
  source_url text,
  consolidated_as_of date,
  extraction_status text NOT NULL DEFAULT 'available',
  review_status text DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legal_reference_id, section_number)
);

ALTER TABLE legal_sections ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON legal_sections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_sections TO service_role;

CREATE INDEX IF NOT EXISTS idx_legal_sections_reference_id ON legal_sections(legal_reference_id);
CREATE INDEX IF NOT EXISTS idx_legal_sections_number ON legal_sections(section_number);
CREATE INDEX IF NOT EXISTS idx_legal_sections_review_status ON legal_sections(review_status);
CREATE INDEX IF NOT EXISTS idx_legal_sections_verified ON legal_sections(verified);

DROP POLICY IF EXISTS "select_legal_sections_public" ON legal_sections;
CREATE POLICY "select_legal_sections_public" ON legal_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_legal_sections_service_role" ON legal_sections;
CREATE POLICY "insert_legal_sections_service_role" ON legal_sections FOR INSERT
  TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "update_legal_sections_service_role" ON legal_sections;
CREATE POLICY "update_legal_sections_service_role" ON legal_sections FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_legal_sections_service_role" ON legal_sections;
CREATE POLICY "delete_legal_sections_service_role" ON legal_sections FOR DELETE
  TO service_role USING (true);
