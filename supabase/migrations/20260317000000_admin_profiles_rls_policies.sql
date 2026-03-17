/*
  Fix Admin Approvals visibility/approval workflow.

  Problem:
  - New admin registrations insert into `admin_profiles` with `is_active = false`
  - Master Admin UI reads from `admin_profiles`
  - If RLS policies only allow "read own row", Master Admin cannot see pending admins

  Solution:
  - Allow authenticated users to INSERT/SELECT their own `admin_profiles` row
  - Allow an ACTIVE Master Admin to SELECT all admin profiles
  - Allow an ACTIVE Master Admin to UPDATE approval state (`is_active`)
*/

ALTER TABLE IF EXISTS admin_profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any old policies (safe if they don't exist)
DROP POLICY IF EXISTS "Admin profiles: select own" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: insert own" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: master select all" ON admin_profiles;
DROP POLICY IF EXISTS "Admin profiles: master update approvals" ON admin_profiles;

-- Users can read their own admin profile row (lets unapproved admins see "pending" message)
CREATE POLICY "Admin profiles: select own"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can create their own admin profile row during admin sign-up
CREATE POLICY "Admin profiles: insert own"
  ON admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ACTIVE Master Admin can read all admin profiles (to approve/decline)
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

-- ACTIVE Master Admin can update approval status
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

