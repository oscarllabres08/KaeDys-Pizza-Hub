-- Allow new admin main categories when menu_items.category uses enum `menu_category`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'menu_category'
  ) THEN
    ALTER TYPE public.menu_category ADD VALUE IF NOT EXISTS 'All Day Silog Meals';
    ALTER TYPE public.menu_category ADD VALUE IF NOT EXISTS 'Chicken';
    ALTER TYPE public.menu_category ADD VALUE IF NOT EXISTS 'Nasi Goreng';
  END IF;
END $$;
