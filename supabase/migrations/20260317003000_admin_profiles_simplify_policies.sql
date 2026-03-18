/*
  Fix "infinite recursion detected" errors on admin_profiles RLS.

  Previous policies for master admin used EXISTS subqueries that read from
  admin_profiles inside the policy expression itself, which can cause
  recursion detection errors in Postgres/Supabase.

  This migration:
  - Drops all existing policies on public.admin_profiles
  - Replaces them with simpler, non-recursive rules:
    * Any authenticated user can SELECT admin_profiles rows (safe small table)
    * Users can INSERT their own row (id = auth.uid())
    * Users can UPDATE their own row
    * Active master admins can UPDATE any row
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

-- Any authenticated user can see admin profiles (tiny table, non-sensitive fields)
CREATE POLICY admin_profiles_select_all
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own admin profile row during admin sign-up
CREATE POLICY admin_profiles_insert_own
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own row; active master admins can update any row
CREATE POLICY admin_profiles_update_self_or_master
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR (
      EXISTS (
        SELECT 1
        FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.is_master_admin = true
          AND ap.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR (
      EXISTS (
        SELECT 1
        FROM public.admin_profiles ap
        WHERE ap.id = auth.uid()
          AND ap.is_master_admin = true
          AND ap.is_active = true
      )
    )
  );

