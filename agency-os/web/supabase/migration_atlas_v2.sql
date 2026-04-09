-- ─────────────────────────────────────────────────────────────────────────────
-- ATLAS v2 Migration — Agency OS
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ALTER: client_dna — adicionar colunas ATLAS v2 ─────────────────────────
-- (tabela já existe com: biografia, voz, credenciais, proibidas)

ALTER TABLE client_dna
  ADD COLUMN IF NOT EXISTS primary_color     TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS secondary_colors  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS font_heading      TEXT DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS font_body         TEXT DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS visual_style      TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS tone              TEXT DEFAULT 'profissional',
  ADD COLUMN IF NOT EXISTS brand_voice_text  TEXT,
  ADD COLUMN IF NOT EXISTS target_audience   TEXT,
  ADD COLUMN IF NOT EXISTS key_message       TEXT,
  ADD COLUMN IF NOT EXISTS reference_images  TEXT[] DEFAULT '{}';

-- Constraint de enum (usa IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_dna_visual_style_check'
  ) THEN
    ALTER TABLE client_dna
      ADD CONSTRAINT client_dna_visual_style_check
      CHECK (visual_style IN ('minimalista','bold','cinematografico','colorido','profile'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_dna_tone_check'
  ) THEN
    ALTER TABLE client_dna
      ADD CONSTRAINT client_dna_tone_check
      CHECK (tone IN ('profissional','casual','inspiracional','tecnico','humor'));
  END IF;
END $$;

-- ─── CREATE: oracle_sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oracle_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oracle_sessions_workspace ON oracle_sessions (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_sessions_client ON oracle_sessions (client_id);
ALTER TABLE oracle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oracle_sessions_auth" ON oracle_sessions;
CREATE POLICY "oracle_sessions_auth" ON oracle_sessions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_oracle_sessions_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_oracle_sessions_updated_at ON oracle_sessions;
CREATE TRIGGER trg_oracle_sessions_updated_at
  BEFORE UPDATE ON oracle_sessions FOR EACH ROW EXECUTE FUNCTION update_oracle_sessions_updated_at();

-- ─── CREATE: agent_conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID REFERENCES oracle_sessions(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  workspace_id UUID,
  agent        TEXT NOT NULL DEFAULT 'oracle',
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_session ON agent_conversations (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_job ON agent_conversations (job_id);
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_conversations_auth" ON agent_conversations;
CREATE POLICY "agent_conversations_auth" ON agent_conversations FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── ALTER: creative_assets — colunas para carrossel ────────────────────────

ALTER TABLE creative_assets
  ADD COLUMN IF NOT EXISTS template             TEXT DEFAULT 'minimalista',
  ADD COLUMN IF NOT EXISTS slide_count          INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slides_data          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS caption              TEXT,
  ADD COLUMN IF NOT EXISTS dna_snapshot         JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_image_url  TEXT;
