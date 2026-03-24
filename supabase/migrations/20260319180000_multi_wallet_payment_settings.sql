/*
  Multi-wallet payment settings managed by Master Admin.
  - Supports GCash, Maya, PayPal
  - Each method has QR image path + account number
*/

CREATE TABLE IF NOT EXISTS public.payment_method_settings (
  method text PRIMARY KEY CHECK (method IN ('GCash', 'Maya', 'PayPal')),
  qr_storage_path text,
  account_number text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_method_settings (method, qr_storage_path, account_number, updated_at)
VALUES
  ('GCash', NULL, NULL, now()),
  ('Maya', NULL, NULL, now()),
  ('PayPal', NULL, NULL, now())
ON CONFLICT (method) DO NOTHING;

-- Migrate previous single GCash setting if present
UPDATE public.payment_method_settings pms
SET qr_storage_path = ss.gcash_qr_storage_path,
    updated_at = now()
FROM public.site_settings ss
WHERE pms.method = 'GCash'
  AND pms.qr_storage_path IS NULL
  AND ss.id = 1
  AND ss.gcash_qr_storage_path IS NOT NULL;

ALTER TABLE public.payment_method_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_method_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_method_settings;', p.policyname);
  END LOOP;
END $$;

-- Storefront/checkout can read
CREATE POLICY payment_method_settings_select_public
  ON public.payment_method_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only ACTIVE MASTER ADMIN can update
CREATE POLICY payment_method_settings_update_master_admin
  ON public.payment_method_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );

-- Realtime support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payment_method_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_method_settings;
  END IF;
END $$;

-- Storage bucket for all wallet QR images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr',
  'payment-qr',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'payment_qr_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

CREATE POLICY payment_qr_objects_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'payment-qr');

CREATE POLICY payment_qr_objects_insert_master_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );

CREATE POLICY payment_qr_objects_update_master_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'payment-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );

CREATE POLICY payment_qr_objects_delete_master_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
        AND ap.is_master_admin = true
    )
  );
