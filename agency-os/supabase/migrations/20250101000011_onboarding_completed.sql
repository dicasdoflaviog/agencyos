-- Adiciona coluna de controle de onboarding no workspace
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Adiciona coluna rápida no profiles para lookup no middleware (evita join)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Backfill workspaces que já tinham completed_at em onboarding_progress
UPDATE workspaces w
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM onboarding_progress op
  WHERE op.workspace_id = w.id AND op.completed_at IS NOT NULL
);

-- Backfill profiles via profiles.workspace_id (workspace_members não tem essa coluna)
UPDATE profiles p
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM onboarding_progress op
  WHERE op.workspace_id = p.workspace_id AND op.completed_at IS NOT NULL
);

-- Bucket público para logos de agência
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket logos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'logos_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'logos_auth_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "logos_auth_upload" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'logos_auth_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "logos_auth_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
