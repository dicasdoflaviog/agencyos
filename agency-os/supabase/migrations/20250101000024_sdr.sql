-- ─── BLOCO 0: SDR — Migration SQL ────────────────────────────────────────────
-- Adapta a tabela `leads` existente + cria tabelas novas do SDR autônomo

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── EXTEND leads (tabela existente) ─────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS workspace_id  UUID,
  ADD COLUMN IF NOT EXISTS niche         TEXT,
  ADD COLUMN IF NOT EXISTS sdr_temperature TEXT CHECK (sdr_temperature IN ('hot','warm','cold')),
  ADD COLUMN IF NOT EXISTS source_id         UUID,  -- será FK após lead_sources existir
  ADD COLUMN IF NOT EXISTS sdr_pipeline_id   UUID,  -- será FK após sdr_pipelines existir
  ADD COLUMN IF NOT EXISTS enriched_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_score    SMALLINT;

-- ─── EXTEND lead_activities (tabela existente) ───────────────────────────────
ALTER TABLE lead_activities
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('outbound','inbound')),
  ADD COLUMN IF NOT EXISTS notes     TEXT;

-- ─── crm_scores (nova — referenciada pelo HARBOR) ────────────────────────────
CREATE TABLE IF NOT EXISTS crm_scores (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  score         SMALLINT,
  justification TEXT,
  scored_by     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);
ALTER TABLE crm_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_scores_auth" ON crm_scores FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── lead_sources ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_sources (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('form','webhook','manual','outbound')),
  webhook_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  config        JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  leads_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON lead_sources (workspace_id);
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_sources_auth" ON lead_sources FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── sdr_pipelines ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sdr_pipelines (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id              UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  workspace_id         UUID NOT NULL,
  user_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'running'
                         CHECK (status IN ('running','paused','converted','dead','waiting_human')),
  current_step         INTEGER DEFAULT 0,
  next_action_at       TIMESTAMPTZ DEFAULT NOW(),
  interest_detected    BOOLEAN DEFAULT FALSE,
  interest_detected_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON sdr_pipelines (lead_id);
CREATE INDEX ON sdr_pipelines (workspace_id, status);
CREATE INDEX ON sdr_pipelines (next_action_at) WHERE status = 'running';
ALTER TABLE sdr_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_pipelines_auth" ON sdr_pipelines FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── sdr_actions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sdr_actions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id  UUID REFERENCES sdr_pipelines(id) ON DELETE CASCADE NOT NULL,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  step         INTEGER NOT NULL,
  agent        TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','sent','failed','skipped')),
  input        JSONB DEFAULT '{}',
  output       JSONB DEFAULT '{}',
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON sdr_actions (pipeline_id, step);
CREATE INDEX ON sdr_actions (lead_id);
CREATE INDEX ON sdr_actions (status) WHERE status = 'pending';
ALTER TABLE sdr_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdr_actions_auth" ON sdr_actions FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── lead_enrichments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id               UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  instagram_handle      TEXT,
  instagram_followers   INTEGER,
  instagram_posts_freq  TEXT,
  instagram_content_type TEXT,
  website_url           TEXT,
  website_summary       TEXT,
  niche_detected        TEXT,
  pain_points           TEXT[] DEFAULT '{}',
  raw_data              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);
ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_enrichments_auth" ON lead_enrichments FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── FKs retroativas em leads ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_leads_source_id' AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT fk_leads_source_id
      FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_leads_sdr_pipeline_id' AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT fk_leads_sdr_pipeline_id
      FOREIGN KEY (sdr_pipeline_id) REFERENCES sdr_pipelines(id) ON DELETE SET NULL;
  END IF;
END $$;
