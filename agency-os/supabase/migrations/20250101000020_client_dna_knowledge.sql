-- ============================================================
-- Migration 20: Client DNA (structured) + Knowledge Files
-- ============================================================

-- 1. Fix source CHECK constraint on client_memories to allow all used values
ALTER TABLE public.client_memories
  DROP CONSTRAINT IF EXISTS client_memories_source_check;

ALTER TABLE public.client_memories
  ADD CONSTRAINT client_memories_source_check
    CHECK (source IN (
      'output_approved', 'briefing', 'manual',
      'dna_document', 'dna_field', 'knowledge_file'
    ));

-- 2. client_dna: structured DNA data per client
CREATE TABLE IF NOT EXISTS public.client_dna (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- General Info
  company_name         TEXT,
  website              TEXT,
  business_description TEXT,
  founded_year         TEXT,
  team_size            TEXT,

  -- Branding
  primary_color        TEXT,
  secondary_color      TEXT,
  fonts                TEXT,
  tone_of_voice        TEXT,
  brand_style          TEXT,
  brand_personality    TEXT,

  -- Target Audience
  persona_name         TEXT,
  persona_age          TEXT,
  persona_pain_points  TEXT,
  persona_desires      TEXT,
  demographics         TEXT,

  -- Products / Services
  main_product         TEXT,
  price_range          TEXT,
  key_differentiators  TEXT,
  offers               TEXT,

  -- Commercial Goals
  monthly_revenue_goal NUMERIC,
  primary_channels     TEXT,
  priority_actions     TEXT,
  business_goals       TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(client_id)
);

ALTER TABLE public.client_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_dna_workspace_access" ON public.client_dna
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_client_dna_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS client_dna_updated_at ON public.client_dna;
CREATE TRIGGER client_dna_updated_at
  BEFORE UPDATE ON public.client_dna
  FOR EACH ROW EXECUTE FUNCTION public.update_client_dna_updated_at();

-- 3. knowledge_files: uploaded documents per client
CREATE TABLE IF NOT EXISTS public.knowledge_files (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size    INTEGER,
  file_hash    TEXT,
  sync_status  TEXT DEFAULT 'pending'
                 CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error   TEXT,
  synced_at    TIMESTAMPTZ,
  content_text TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by   UUID REFERENCES auth.users(id)
);

ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_files_workspace_access" ON public.knowledge_files
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- 4. Storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "knowledge_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'knowledge-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "knowledge_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'knowledge-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "knowledge_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'knowledge-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
