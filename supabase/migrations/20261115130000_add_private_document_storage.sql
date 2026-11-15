-- Private originals for the existing documents table. Object keys always begin with auth.uid().
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-documents',
  'professional-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS professional_documents_insert_owner ON storage.objects;
CREATE POLICY professional_documents_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'professional-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS professional_documents_select_owner ON storage.objects;
CREATE POLICY professional_documents_select_owner ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'professional-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS professional_documents_update_owner ON storage.objects;
CREATE POLICY professional_documents_update_owner ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'professional-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'professional-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS professional_documents_delete_owner ON storage.objects;
CREATE POLICY professional_documents_delete_owner ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'professional-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
