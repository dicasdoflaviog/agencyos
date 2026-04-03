-- ============================================================
-- Agency OS — Migration Fase 2
-- Execute no Supabase SQL Editor
-- ============================================================

-- Função update_updated_at (se não existir da Fase 1)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- BLOCO E (deve vir antes): job_templates (referenciada em jobs)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  content_type     TEXT CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  default_agents   TEXT[] DEFAULT '{}',
  briefing_template JSONB DEFAULT '{}',
  pipeline_id      UUID,  -- FK adicionada após agent_pipelines ser criada
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage templates" ON job_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_job_templates_updated_at
  BEFORE UPDATE ON job_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BLOCO A: Alterar jobs + criar job_briefings
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES job_templates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS job_briefings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id          UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  content_type    TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'stories', 'email', 'video', 'blog', 'ad', 'other')),
  objective       TEXT,
  target_audience TEXT,
  key_message     TEXT,
  tone            TEXT,
  restrictions    TEXT,
  deadline_notes  TEXT,
  reference_urls  TEXT[] DEFAULT '{}',
  custom_fields   JSONB DEFAULT '{}',
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id)
);

ALTER TABLE job_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage briefings" ON job_briefings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_job_briefings_updated_at
  BEFORE UPDATE ON job_briefings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BLOCO B: Alterar job_outputs + criar output_approval_events
-- ============================================================

ALTER TABLE job_outputs
  ADD COLUMN IF NOT EXISTS approval_stage TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_stage IN ('draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected')),
  ADD COLUMN IF NOT EXISTS output_version INTEGER NOT NULL DEFAULT 1;

-- Migrar outputs existentes
UPDATE job_outputs SET approval_stage = 'approved' WHERE status = 'approved';
UPDATE job_outputs SET approval_stage = 'rejected' WHERE status = 'rejected';

CREATE TABLE IF NOT EXISTS output_approval_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id  UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  from_stage TEXT,
  to_stage   TEXT NOT NULL CHECK (to_stage IN ('draft', 'internal_review', 'client_review', 'approved', 'published', 'rejected')),
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE output_approval_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view approval events" ON output_approval_events
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_approval_events_output_id ON output_approval_events(output_id, created_at DESC);

-- ============================================================
-- BLOCO D: agent_pipelines + pipeline_runs
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_pipelines (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]',
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id   UUID REFERENCES agent_pipelines(id) ON DELETE SET NULL,
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  current_step  INTEGER NOT NULL DEFAULT 0,
  results       JSONB NOT NULL DEFAULT '[]',
  error_message TEXT,
  started_by    UUID REFERENCES profiles(id),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage pipelines" ON agent_pipelines
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users manage pipeline runs" ON pipeline_runs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_agent_pipelines_updated_at
  BEFORE UPDATE ON agent_pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_job_id ON pipeline_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);

-- Adicionar FK de job_templates para agent_pipelines (agora que a tabela existe)
ALTER TABLE job_templates
  ADD CONSTRAINT fk_job_templates_pipeline
  FOREIGN KEY (pipeline_id) REFERENCES agent_pipelines(id) ON DELETE SET NULL;

-- ============================================================
-- BLOCO E (continuação): job_attachments + notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS job_attachments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type    TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'doc', 'video', 'other')),
  file_size    INTEGER,
  uploaded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage attachments" ON job_attachments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON job_attachments(job_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN (
    'job_overdue', 'approval_pending', 'output_ready',
    'pipeline_complete', 'revision_requested', 'stage_changed'
  )),
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  link       TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- ============================================================
-- BLOCO C: Índices de performance para Analytics
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_job_outputs_created_at ON job_outputs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_outputs_approval_stage ON job_outputs(approval_stage, client_id);
CREATE INDEX IF NOT EXISTS idx_job_outputs_agent_id ON job_outputs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_client_status ON jobs(client_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date) WHERE status NOT IN ('done', 'cancelled');

-- ============================================================
-- FIM DA MIGRATION FASE 2
-- ============================================================
