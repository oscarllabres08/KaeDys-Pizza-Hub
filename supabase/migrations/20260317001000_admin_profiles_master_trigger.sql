/*
  Admin approval + master admin bootstrap (RLS-safe).

  Goals:
  - New admin sign-ups can INSERT their own row into `admin_profiles`.
  - Unapproved admins can SELECT their own row (so UI can show "pending").
  - Active Master Admin can SELECT/UPDATE all admin profiles for approvals.
  - The FIRST ever admin created is automatically promoted to Master Admin + Active.

  Why:
  - Client-side "is there a master admin?" checks break under RLS.
  - This migration moves the bootstrap logic into the database via trigger.
*/

-- Ensure table/columns exist (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_master_admin boolean DEFAULT false,
  is_active boolean DEFAULT false
);

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_master_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

ALTER TABLE IF EXISTS admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policies (drop + recreate)
DROP POLICY IF EXISTS "Admin profiles: select own" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: insert own" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: master select all" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: master update approvals" ON admin_profiles;

CREATE POLICY "Admin profiles: select own"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin profiles: insert own"
  ON admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin profiles: master select all"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  );

CREATE POLICY "Admin profiles: master update approvals"
  ON admin_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_master_admin = true
        AND ap.is_active = true
    )
  );

-- Trigger to auto-promote the first admin to Master Admin
CREATE OR REPLACE FUNCTION public.promote_first_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If there is no master admin yet, promote this newly inserted profile
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

