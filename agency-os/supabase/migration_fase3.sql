-- =============================================================================
-- MIGRATION FASE 3 — Client Portal, CRM, Realtime, Versioning, Reports
-- Execute no Supabase SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLIENT PORTAL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role         TEXT NOT NULL DEFAULT 'client'  CHECK (role IN ('client', 'guest')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  invited_by   UUID REFERENCES auth.users(id),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_invites_token_idx    ON client_invites(token);
CREATE INDEX IF NOT EXISTS client_invites_client_idx   ON client_invites(client_id);
CREATE INDEX IF NOT EXISTS client_invites_email_idx    ON client_invites(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. OUTPUT VERSIONING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS output_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id    UUID NOT NULL REFERENCES job_outputs(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL DEFAULT 1,
  content      JSONB,
  file_url     TEXT,
  message      TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS output_versions_output_idx ON output_versions(output_id);
CREATE UNIQUE INDEX IF NOT EXISTS output_versions_unique ON output_versions(output_id, version);

-- Auto-increment version per output
CREATE OR REPLACE FUNCTION set_output_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM output_versions
   WHERE output_id = NEW.output_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_output_version ON output_versions;
CREATE TRIGGER trg_output_version
  BEFORE INSERT ON output_versions
  FOR EACH ROW EXECUTE FUNCTION set_output_version();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CRM — Leads
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT,
  email        TEXT,
  phone        TEXT,
  source       TEXT CHECK (source IN ('instagram','linkedin','referral','website','cold_email','other')),
  stage        TEXT NOT NULL DEFAULT 'lead'
                 CHECK (stage IN ('lead','qualified','proposal','negotiation','won','lost')),
  deal_value   NUMERIC(12,2),
  notes        TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  assigned_to  UUID REFERENCES profiles(id),
  converted_to UUID REFERENCES clients(id),
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_stage_idx       ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_assigned_idx    ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_converted_idx   ON leads(converted_to);

CREATE TABLE IF NOT EXISTS lead_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('note','call','email','meeting','whatsapp','stage_change','converted')),
  content      TEXT,
  metadata     JSONB DEFAULT '{}',
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON lead_activities(lead_id);

CREATE TABLE IF NOT EXISTS lead_tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#F59E0B'
);

CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INTEGRATION CONFIGS (base para Bloco B)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('whatsapp','instagram','meta_ads','google_ads','linkedin')),
  credentials JSONB DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','error','revoked')),
  metadata    JSONB DEFAULT '{}',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_configs_client_idx ON integration_configs(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  format        TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf','excel')),
  sections      TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','ready','failed')),
  file_url      TEXT,
  generated_by  UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_client_idx ON reports(client_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);

CREATE TABLE IF NOT EXISTS report_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ,
  views       INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_shares_token_idx ON report_shares(token);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EMAIL LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  template     TEXT,
  resend_id    TEXT,
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','bounced','failed')),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AUTOMATION RULES (base para Fase 4 AI)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('job_status_change','output_approved','lead_stage_change','overdue','manual')),
  conditions   JSONB DEFAULT '{}',
  actions      JSONB DEFAULT '[]',
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leads','integration_configs','reports','automation_rules'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I;
       CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE client_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE output_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tag_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules      ENABLE ROW LEVEL SECURITY;

-- Agency team can read/write everything
CREATE POLICY "team_all_client_invites"
  ON client_invites FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_output_versions"
  ON output_versions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

-- Clients can see their own output versions
-- Corrected: profiles.client_id → job_outputs.client_id (direct FK, no extra hops)
DROP POLICY IF EXISTS "client_read_own_output_versions" ON output_versions;

CREATE POLICY "client_read_own_output_versions"
  ON output_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN job_outputs jo ON jo.client_id = p.client_id
      WHERE p.id = auth.uid()
        AND p.role = 'client'
        AND jo.id = output_versions.output_id
    )
  );

CREATE POLICY "team_all_leads"
  ON leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_lead_activities"
  ON lead_activities FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_lead_tags"
  ON lead_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_lead_tag_assignments"
  ON lead_tag_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_integration_configs"
  ON integration_configs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_reports"
  ON reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_report_shares"
  ON report_shares FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

CREATE POLICY "team_all_automation_rules"
  ON automation_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator'))
  );

-- Admins read email logs
CREATE POLICY "admin_read_email_logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ENABLE REALTIME on jobs and job_outputs
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Enable this manually in Supabase Dashboard → Database → Replication
-- or run the SQL below:

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_outputs;

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE — Fase 3 migration complete
-- ─────────────────────────────────────────────────────────────────────────────
