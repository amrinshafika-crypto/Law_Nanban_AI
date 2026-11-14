-- Provision profiles on the trusted auth.users insert path.
CREATE OR REPLACE FUNCTION public.provision_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
      'Citizen'
    ),
    'citizen'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_profile_for_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_profile_for_auth_user();

-- Existing profile records (including professional/admin roles) are untouched.
-- Accounts missing a profile recover as citizens; client metadata never grants a role.
INSERT INTO public.profiles (id, email, display_name, role)
SELECT
  users.id,
  COALESCE(users.email, ''),
  COALESCE(
    NULLIF(BTRIM(users.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(users.email, ''), '@', 1), ''),
    'Citizen'
  ),
  'citizen'
FROM auth.users AS users
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may update ordinary profile fields, but cannot create rows
-- or update roles. Trusted service-role administration retains its existing grants.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (display_name, bar_number, phone, organization, preferred_language)
  ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_untrusted_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
    AND CURRENT_USER NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Profile role changes require trusted administrative access.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_untrusted_profile_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_untrusted_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_untrusted_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_untrusted_profile_role_change();
