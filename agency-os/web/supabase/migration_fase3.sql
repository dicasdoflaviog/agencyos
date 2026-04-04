-- ============================================================
-- Agency OS — Migration Fase 3
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'collaborator', 'client'));
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT ARRAY['in_app'],
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS client_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_invites_email ON client_invites(email);
CREATE INDEX IF NOT EXISTS idx_client_invites_token ON client_invites(token);
CREATE INDEX IF NOT EXISTS idx_client_invites_client ON client_invites(client_id);

CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp','instagram','meta_ads','google_analytics')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, type)
);
CREATE TRIGGER trg_integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  to_number TEXT,
  from_number TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text','template','interactive')) DEFAULT 'text',
  template_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','delivered','read','failed')) DEFAULT 'pending',
  twilio_sid TEXT,
  output_id UUID REFERENCES job_outputs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  output_id UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','both')),
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  publish_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('scheduled','publishing','published','failed','cancelled')) DEFAULT 'scheduled',
  platform_post_id TEXT,
  error_message TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS post_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  platform_post_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook')),
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','PAUSED','DELETED','ARCHIVED')) DEFAULT 'ACTIVE',
  objective TEXT,
  spend NUMERIC(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(6,4),
  cpc NUMERIC(8,2),
  conversions INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, period_start)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf','excel')) DEFAULT 'pdf',
  sections TEXT[] DEFAULT '{}',
  file_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','generating','ready','failed')) DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  views INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('prospect','contacted','proposal_sent','negotiation','won','lost')) DEFAULT 'prospect',
  deal_value NUMERIC(12,2),
  source TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  notes TEXT,
  lost_reason TEXT,
  expected_close DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call','email','meeting','note','stage_change','whatsapp')),
  title TEXT NOT NULL,
  body TEXT,
  performed_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES lead_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','bounced')) DEFAULT 'sent',
  resend_id TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  action TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS output_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID REFERENCES job_outputs(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_output_versions_output ON output_versions(output_id);

CREATE OR REPLACE FUNCTION capture_output_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.output_content IS DISTINCT FROM NEW.output_content THEN
    INSERT INTO output_versions (output_id, version_number, content, changed_by)
    SELECT OLD.id,
           COALESCE((SELECT MAX(version_number) FROM output_versions WHERE output_id = OLD.id), 0) + 1,
           OLD.output_content,
           auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_output_version ON job_outputs;
CREATE TRIGGER trg_capture_output_version
  BEFORE UPDATE ON job_outputs
  FOR EACH ROW EXECUTE FUNCTION capture_output_version();

ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_invites" ON client_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_leads" ON leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','collaborator')));

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_reports" ON reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE output_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_versions" ON output_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_versions" ON output_versions FOR INSERT TO authenticated WITH CHECK (true);
