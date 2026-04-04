-- agent_conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  agent        TEXT NOT NULL CHECK (agent IN ('oracle','vera','atlas')),
  role         TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content      TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_job ON agent_conversations(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_workspace ON agent_conversations(workspace_id, created_at DESC);

-- creative_assets
CREATE TABLE IF NOT EXISTS creative_assets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'post_feed',
  prompt        TEXT NOT NULL,
  reference_url TEXT,
  image_url     TEXT NOT NULL,
  model         TEXT DEFAULT 'dall-e-3',
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creative_assets_client ON creative_assets(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_assets_job ON creative_assets(job_id);

-- RLS
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_agent_conversations" ON agent_conversations
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_id = agent_conversations.workspace_id));

ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_creative_assets" ON creative_assets
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_id = creative_assets.workspace_id));
