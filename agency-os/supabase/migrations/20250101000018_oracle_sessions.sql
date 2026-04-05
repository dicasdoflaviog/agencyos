-- ── Oracle Sessions ────────────────────────────────────────────────────────
-- Each chat session gets a UUID persisted in the URL (?session=UUID).
-- agent_conversations gains a session_id FK so history is cleanly scoped.

CREATE TABLE IF NOT EXISTS oracle_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id)    ON DELETE SET NULL,
  job_id       UUID REFERENCES jobs(id)       ON DELETE SET NULL,
  title        TEXT DEFAULT 'Nova Conversa',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oracle_sessions_workspace
  ON oracle_sessions(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_sessions_client
  ON oracle_sessions(client_id, updated_at DESC);

ALTER TABLE oracle_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_oracle_sessions" ON oracle_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND workspace_id = oracle_sessions.workspace_id
    )
  );

-- Add session_id to agent_conversations
ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES oracle_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_conversations_session
  ON agent_conversations(session_id, created_at);

-- Auto-update oracle_sessions.updated_at when a message is added
CREATE OR REPLACE FUNCTION update_oracle_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE oracle_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_oracle_session_updated ON agent_conversations;
CREATE TRIGGER trg_oracle_session_updated
  AFTER INSERT ON agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_oracle_session_timestamp();
