-- Add optional subcategory for menu items.
-- Admin can leave this blank when no subcategory is needed.
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS subcategory text;
