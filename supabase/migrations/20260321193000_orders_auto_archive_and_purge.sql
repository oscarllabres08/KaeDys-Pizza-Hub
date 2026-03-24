/*
  Auto-archive completed orders and auto-delete archived records after 3 days.
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill existing completed orders to archived state
UPDATE public.orders
SET
  is_archived = true,
  archived_at = COALESCE(archived_at, updated_at, created_at, now())
WHERE status = 'completed'
  AND (is_archived = false OR archived_at IS NULL);

CREATE OR REPLACE FUNCTION public.sync_order_archive_from_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.is_archived := true;
    IF NEW.archived_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed') THEN
      NEW.archived_at := now();
    END IF;
  ELSE
    NEW.is_archived := false;
    NEW.archived_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_archive ON public.orders;
CREATE TRIGGER trg_orders_sync_archive
BEFORE INSERT OR UPDATE OF status
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_archive_from_status();

CREATE OR REPLACE FUNCTION public.purge_old_archived_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.orders
  WHERE is_archived = true
    AND archived_at IS NOT NULL
    AND archived_at <= now() - interval '3 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_archived_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_archived_orders() TO authenticated;

-- Schedule daily purge via pg_cron when available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'purge_old_archived_orders_daily'
    ) THEN
      PERFORM cron.schedule(
        'purge_old_archived_orders_daily',
        '10 3 * * *',
        $job$SELECT public.purge_old_archived_orders();$job$
      );
    END IF;
  END IF;
END $$;
