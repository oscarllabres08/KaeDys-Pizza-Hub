-- Allow customers to delete their own orders ONLY when completed/cancelled.
-- Needed for "My Orders" multi-delete in Profile page.

-- Orders: allow delete for owner when status is completed/cancelled
DROP POLICY IF EXISTS "Users can delete own completed/cancelled orders" ON public.orders;
CREATE POLICY "Users can delete own completed/cancelled orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status IN ('completed', 'cancelled')
  );

-- Order items: required for ON DELETE CASCADE from orders -> order_items
DROP POLICY IF EXISTS "Users can delete own order items for completed/cancelled orders" ON public.order_items;
CREATE POLICY "Users can delete own order items for completed/cancelled orders"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
        AND orders.status IN ('completed', 'cancelled')
    )
  );

