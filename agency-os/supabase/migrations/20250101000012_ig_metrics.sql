-- ig_metrics: add columns needed for Apify sync (table already exists from fase4)
ALTER TABLE ig_metrics
  ADD COLUMN IF NOT EXISTS username    TEXT,
  ADD COLUMN IF NOT EXISTS following   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_data    JSONB,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Drop old broad policy (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "team_ig_metrics" ON ig_metrics;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- New policy: only authenticated workspace members
DO $$ BEGIN
  CREATE POLICY "workspace_ig_metrics"
    ON ig_metrics FOR ALL
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'collaborator')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
