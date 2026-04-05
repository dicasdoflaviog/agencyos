-- ig_metrics: Instagram metrics synced via Apify
CREATE TABLE IF NOT EXISTS ig_metrics (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  username    TEXT,
  followers   INTEGER DEFAULT 0,
  following   INTEGER DEFAULT 0,
  posts       INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  raw_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, date)
);

ALTER TABLE ig_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read ig_metrics"
  ON ig_metrics FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "workspace members can write ig_metrics"
  ON ig_metrics FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
