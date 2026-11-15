CREATE TABLE IF NOT EXISTS public.legal_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (char_length(document_type) BETWEEN 1 AND 80),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_drafts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_drafts TO authenticated;
DROP POLICY IF EXISTS legal_drafts_owner ON public.legal_drafts;
CREATE POLICY legal_drafts_owner ON public.legal_drafts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid() AND (
      case_id IS NULL OR EXISTS (
        SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.assigned_to = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_legal_drafts_owner_updated
  ON public.legal_drafts(owner_id, updated_at DESC);
