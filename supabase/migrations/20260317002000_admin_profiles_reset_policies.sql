/*
  Hard reset RLS policies for public.admin_profiles.

  Use this if the app still shows "Administrators only" even though the row exists,
  which indicates SELECT is being blocked by some leftover policy names.
*/

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_profiles;', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own admin profile row (even if pending)
CREATE POLICY "admin_profiles_select_own"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can create their own admin profile row during admin sign-up
CREATE POLICY "admin_profiles_insert_own"
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ACTIVE Master Admin can read all admin profiles (to approve/decline)
CREATE POLICY "admin_profiles_master_select_all"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  );

-- ACTIVE Master Admin can update approval status
CREATE POLICY "admin_profiles_master_update"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  );

-- Ensure the "first admin becomes master" trigger exists
CREATE OR REPLACE FUNCTION public.promote_first_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_profiles WHERE is_master_admin = true) THEN
    UPDATE public.admin_profiles
      SET is_master_admin = true,
          is_active = true
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_first_admin_profile ON public.admin_profiles;
CREATE TRIGGER trg_promote_first_admin_profile
AFTER INSERT ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.promote_first_admin_profile();

