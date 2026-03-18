/*
  Allow admin dashboard to read customer details for orders.

  Problem:
  - Admin UI fetches customer details from public.customer_profiles by id (order.user_id).
  - With RLS enabled (or when adding it later), admin reads can be blocked and return empty rows.

  Solution:
  - Enable RLS on public.customer_profiles
  - Allow authenticated users to SELECT their own row
  - Allow ACTIVE admins to SELECT all customer profiles (read-only)
*/

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (safe)
DROP POLICY IF EXISTS "customer_profiles_select_own" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_admin_select_all" ON public.customer_profiles;

-- Customers can read their own profile
CREATE POLICY "customer_profiles_select_own"
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ACTIVE admins can read all customer profiles (for order management)
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

