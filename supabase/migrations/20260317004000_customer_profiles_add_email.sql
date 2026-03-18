-- Add email column to customer_profiles for showing customer info on orders

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS email text;

