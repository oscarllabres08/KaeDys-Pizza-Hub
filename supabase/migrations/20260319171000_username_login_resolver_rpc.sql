/*
  Username login resolver:
  - lets public app resolve username -> email for sign-in
  - keeps logic inside DB with normalized username matching
*/

CREATE OR REPLACE FUNCTION public.resolve_customer_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := lower(trim(coalesce(p_identifier, '')));
  v_email text;
BEGIN
  IF v_identifier = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' in v_identifier) > 0 THEN
    RETURN v_identifier;
  END IF;

  SELECT cp.email
  INTO v_email
  FROM public.customer_profiles cp
  WHERE lower(cp.username) = v_identifier
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_customer_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_customer_login_email(text) TO anon, authenticated;
