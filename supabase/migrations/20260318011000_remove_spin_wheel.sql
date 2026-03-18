-- Remove Spin the Wheel game artifacts
DROP TABLE IF EXISTS public.spin_wheel_results;

ALTER TABLE public.game_settings
  DROP COLUMN IF EXISTS spin_wheel_active;

