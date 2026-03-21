-- Single round-trip checkout: avoids mobile networks failing between orders + order_items inserts
-- (symptom: order appears in admin but client shows "Checkout Failed").

CREATE OR REPLACE FUNCTION public.place_customer_order(
  p_total_amount numeric,
  p_discount_amount numeric,
  p_final_amount numeric,
  p_payment_method text,
  p_payment_reference text,
  p_payment_proof_url text,
  p_delivery_address text,
  p_contact_phone text,
  p_notes text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('COD', 'GCash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must include at least one item';
  END IF;

  INSERT INTO public.orders (
    user_id,
    total_amount,
    discount_amount,
    final_amount,
    payment_method,
    payment_reference,
    payment_proof_url,
    delivery_address,
    contact_phone,
    notes,
    status
  ) VALUES (
    v_uid,
    p_total_amount,
    COALESCE(p_discount_amount, 0),
    p_final_amount,
    p_payment_method,
    NULLIF(trim(COALESCE(p_payment_reference, '')), ''),
    p_payment_proof_url,
    trim(p_delivery_address),
    trim(p_contact_phone),
    p_notes,
    'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    menu_item_id,
    menu_item_name,
    quantity,
    price,
    subtotal
  )
  SELECT
    v_order_id,
    (elem->>'menu_item_id')::uuid,
    COALESCE(elem->>'menu_item_name', ''),
    (elem->>'quantity')::integer,
    (elem->>'price')::numeric(10, 2),
    (elem->>'subtotal')::numeric(10, 2)
  FROM jsonb_array_elements(p_items) AS elem;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_customer_order(
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_customer_order(
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) TO authenticated;
