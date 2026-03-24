/*
  Master-admin customer user management:
  - Add temporary suspension fields on customer_profiles
  - Ensure profile policies support own insert/update and admin reads
  - Allow only ACTIVE MASTER ADMIN to manage (update/delete any customer row)
  - Provide secure RPC to fully delete customer auth account (auth.users)
*/

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_profiles_select_own" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_select_all" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_insert_own" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_update_own" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_master_update_any" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_master_delete_any" ON public.customer_profiles;

-- Customer can read own profile
CREATE POLICY "customer_profiles_select_own"
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Any active admin can read all customer profiles (orders + management visibility)
CREATE POLICY "customer_profiles_admin_select_all"
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );

-- Customer can create own profile on sign-up
CREATE POLICY "customer_profiles_insert_own"
  ON public.customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Customer can update own editable profile details
CREATE POLICY "customer_profiles_update_own"
  ON public.customer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ACTIVE MASTER ADMIN can update any customer row (suspend/unsuspend/manage)
CREATE POLICY "customer_profiles_master_update_any"
  ON public.customer_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );

-- ACTIVE MASTER ADMIN can delete customer profile rows
CREATE POLICY "customer_profiles_master_delete_any"
  ON public.customer_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );

-- Secure RPC: delete customer account completely from auth.users (cascades profile/orders)
CREATE OR REPLACE FUNCTION public.master_admin_delete_customer_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles ap
    WHERE ap.id = auth.uid()
      AND ap.is_active = true
      AND ap.is_master_admin = true
  ) THEN
    RAISE EXCEPTION 'Only active master admin can delete users';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Master admin cannot delete own account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_profiles ap2
    WHERE ap2.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete admin account via customer delete function';
  END IF;

  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.master_admin_delete_customer_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.master_admin_delete_customer_account(uuid) TO authenticated;
