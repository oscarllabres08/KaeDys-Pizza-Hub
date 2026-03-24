/*
  Add username support for customer accounts.

  Goals:
  - Store a username in customer_profiles
  - Enforce uniqueness (case-insensitive) and safe format
  - Allow existing rows to be backfilled safely
*/

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Backfill from email local-part when possible
UPDATE public.customer_profiles
SET username = lower(regexp_replace(split_part(coalesce(email, ''), '@', 1), '[^a-z0-9_]+', '_', 'g'))
WHERE username IS NULL;

-- Fallback usernames for rows that still ended up empty/null
UPDATE public.customer_profiles
SET username = 'user_' || left(replace(id::text, '-', ''), 8)
WHERE username IS NULL OR btrim(username) = '';

-- Normalize and trim
UPDATE public.customer_profiles
SET username = lower(btrim(username))
WHERE username IS NOT NULL;

-- Resolve duplicates by appending a stable suffix for later duplicate rows
WITH ranked AS (
  SELECT
    id,
    username,
    row_number() OVER (PARTITION BY lower(username) ORDER BY created_at, id) AS rn
  FROM public.customer_profiles
)
UPDATE public.customer_profiles cp
SET username = cp.username || '_' || right(replace(cp.id::text, '-', ''), 4)
FROM ranked r
WHERE cp.id = r.id
  AND r.rn > 1;

ALTER TABLE public.customer_profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_username_format_chk
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

CREATE UNIQUE INDEX IF NOT EXISTS customer_profiles_username_lower_uq
  ON public.customer_profiles (lower(username));
