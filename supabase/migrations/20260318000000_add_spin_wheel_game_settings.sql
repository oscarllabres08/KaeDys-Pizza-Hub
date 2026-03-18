-- Add separate toggles for each discount game
ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS falling_pizza_active boolean,
  ADD COLUMN IF NOT EXISTS spin_wheel_active boolean;

-- Backfill from legacy is_active column (falling pizza)
UPDATE public.game_settings
SET
  falling_pizza_active = COALESCE(falling_pizza_active, is_active),
  spin_wheel_active = COALESCE(spin_wheel_active, false),
  updated_at = now();

