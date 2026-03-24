/*
  Allow active admins to delete archived orders.
*/

DROP POLICY IF EXISTS "Admins can delete archived orders" ON public.orders;

CREATE POLICY "Admins can delete archived orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    is_archived = true
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );
