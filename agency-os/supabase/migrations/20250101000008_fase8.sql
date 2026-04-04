-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 8 — Execução Multimodal
-- ─────────────────────────────────────────────────────────────────────────────

-- Video jobs (async Veo 2)
CREATE TABLE IF NOT EXISTS video_jobs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  format        TEXT NOT NULL DEFAULT 'reels',
  prompt        TEXT NOT NULL,
  reference_url TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  video_url     TEXT,
  veo_job_id    TEXT,
  duration_s    INTEGER DEFAULT 15,
  error_msg     TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  CONSTRAINT video_jobs_format_check CHECK (format IN ('reels','tiktok','shorts','banner')),
  CONSTRAINT video_jobs_status_check CHECK (status IN ('pending','processing','done','failed'))
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_client ON video_jobs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status, created_at);

-- Audio assets (ElevenLabs VOX)
CREATE TABLE IF NOT EXISTS audio_assets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  text_content  TEXT NOT NULL,
  voice_id      TEXT NOT NULL DEFAULT 'rachel',
  audio_url     TEXT NOT NULL,
  duration_s    INTEGER,
  format        TEXT DEFAULT 'mp3',
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audio_assets_client ON audio_assets(client_id, created_at DESC);

-- Client visual references (Apify)
CREATE TABLE IF NOT EXISTS client_references (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  colors        TEXT[] DEFAULT '{}',
  fonts         TEXT[] DEFAULT '{}',
  screenshot_url TEXT,
  raw_data      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_references_client ON client_references(client_id, created_at DESC);

-- RLS
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_video_jobs" ON video_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_id = video_jobs.workspace_id));

ALTER TABLE audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_audio_assets" ON audio_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_id = audio_assets.workspace_id));

ALTER TABLE client_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_client_references" ON client_references FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_id = client_references.workspace_id));
