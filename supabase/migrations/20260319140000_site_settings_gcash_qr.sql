/*
  Admin-managed GCash QR (Storage + DB).

  - `site_settings`: singleton row (id = 1) stores storage object path in bucket `gcash-qr`.
  - RLS: anyone can read (anon + authenticated) so the storefront can show the official QR;
    only active `admin_profiles` rows can update settings.
  - Storage: public read on bucket `gcash-qr`; insert/delete only for active admins.
*/

-- ---------------------------------------------------------------------------
-- Table: public.site_settings (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  gcash_qr_storage_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id, gcash_qr_storage_path, updated_at)
VALUES (1, NULL, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_settings;', p.policyname);
  END LOOP;
END $$;

-- Storefront + checkout: read official path (URL is built client-side from Storage)
CREATE POLICY site_settings_select_public
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only approved active admins may change which QR is canonical (not customers)
CREATE POLICY site_settings_update_active_admin
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );

-- Realtime: reflect QR changes without full page reload (optional client subscribe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gcash-qr',
  'gcash-qr',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'gcash_qr_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

CREATE POLICY gcash_qr_objects_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'gcash-qr');

CREATE POLICY gcash_qr_objects_insert_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gcash-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );

CREATE POLICY gcash_qr_objects_delete_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gcash-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );

CREATE POLICY gcash_qr_objects_update_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gcash-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'gcash-qr'
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.is_active = true
    )
  );
