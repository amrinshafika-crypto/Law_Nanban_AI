CREATE OR REPLACE FUNCTION public.law_nanban_registration_timestamp()
RETURNS timestamptz
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.clock_timestamp();
$$;

REVOKE ALL ON FUNCTION public.law_nanban_registration_timestamp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.law_nanban_registration_timestamp() TO service_role;
